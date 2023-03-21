'use strict';
var DFA = require('./lib/dfa.js');

module.exports = function multimd_table_plugin(md, options) {
  var defaults = {
    multiline:  false,
    rowspan:    false,
    headerless: false,
    multibody:  true,
    autolabel:  true
  };
  options = md.utils.assign({}, defaults, options || {});

  function scan_bound_indices(state, line) {
    /**
     * Naming convention of positional variables
     * - list-item
     * ·········longtext······\n
     *   ^head  ^start  ^end  ^max
     */
    var start = state.bMarks[line] + state.sCount[line],
        head = state.bMarks[line] + state.blkIndent,
        end = state.skipSpacesBack(state.eMarks[line], head),
        bounds = [], pos, posjump,
        escape = false, code = false, serial = 0;

    /* Scan for valid pipe character position */
    for (pos = start; pos < end; pos++) {
      switch (state.src.charCodeAt(pos)) {
        case 0x5c /* \ */:
          escape = true; break;
        case 0x60 /* ` */:
          posjump = state.skipChars(pos, 0x60) - 1;
          /* make \` closes the code sequence, but not open it;
             the reason is that `\` is correct code block */
          /* eslint-disable-next-line brace-style */
          if (posjump > pos) {
            if (!code) {
              if (serial === 0) { serial = posjump - pos; } else if (serial === posjump - pos) { serial = 0; }
            }
            pos = posjump;
          } else if (code || (!escape && !serial)) { code = !code; }
          escape = false; break;
        case 0x7c /* | */:
          if (!code && !escape) { bounds.push(pos); }
          escape = false; break;
        default:
          escape = false; break;
      }
    }
    if (bounds.length === 0) return bounds;

    /* Pad in newline characters on last and this line */
    if (bounds[0] > head) { bounds.unshift(head - 1); }
    if (bounds[bounds.length - 1] < end - 1) { bounds.push(end); }

    return bounds;
  }

  function table_caption(state, silent, line) {
    var meta = { text: null, label: null },
        start = state.bMarks[line] + state.sCount[line],
        max = state.eMarks[line],
        /* A non-greedy qualifier allows the label to be matched */
        capRE = /^\[(.+?)\](\[([^\[\]]+)\])?\s*$/,
        matches = state.src.slice(start, max).match(capRE);

    if (!matches) { return false; }
    if (silent)  { return true; }

    meta.text  = matches[1];

    if (!options.autolabel && !matches[2]) { return meta; }

    meta.label = matches[2] || matches[1];
    meta.label = meta.label.toLowerCase().replace(/\W+/g, '');

    return meta;
  }

  function table_row(state, silent, line) {
    var meta = { bounds: null, multiline: null },
        bounds = scan_bound_indices(state, line),
        start, pos, oldMax;

    if (bounds.length < 2) { return false; }
    if (silent) { return true; }

    meta.bounds = bounds;

    /* Multiline. Scan boundaries again since it's very complicated */
    if (options.multiline) {
      start = state.bMarks[line] + state.sCount[line];
      pos = state.eMarks[line] - 1; /* where backslash should be */
      meta.multiline = (state.src.charCodeAt(pos) === 0x5C/* \ */);
      if (meta.multiline) {
        oldMax = state.eMarks[line];
        state.eMarks[line] = state.skipSpacesBack(pos, start);
        meta.bounds = scan_bound_indices(state, line);
        state.eMarks[line] = oldMax;
      }
    }

    return meta;
  }

  function table_separator(state, silent, line) {
    var meta = { aligns: [], wraps: [] },
        bounds = scan_bound_indices(state, line),
        sepRE = /^:?(-+|=+):?\+?$/,
        c, text, align;

    /* Only separator needs to check indents */
    if (state.sCount[line] - state.blkIndent >= 4) { return false; }
    if (bounds.length === 0) { return false; }

    for (c = 0; c < bounds.length - 1; c++) {
      text = state.src.slice(bounds[c] + 1, bounds[c + 1]).trim();
      if (!sepRE.test(text)) { return false; }

      meta.wraps.push(text.charCodeAt(text.length - 1) === 0x2B/* + */);
      align = ((text.charCodeAt(0) === 0x3A/* : */) << 4) |
               (text.charCodeAt(text.length - 1 - meta.wraps[c]) === 0x3A);
      switch (align) {
        case 0x00: meta.aligns.push('');       break;
        case 0x01: meta.aligns.push('right');  break;
        case 0x10: meta.aligns.push('left');   break;
        case 0x11: meta.aligns.push('center'); break;
      }
    }
    if (silent) { return true; }
    return meta;
  }

  function table_empty(state, silent, line) {
    return state.isEmpty(line);
  }

  function table(state, startLine, endLine, silent) {
    /**
     * Regex pseudo code for table:
     *     caption? header+ separator (data+ empty)* data+ caption?
     *
     * We use DFA to emulate this plugin. Types with lower precedence are
     * set-minus from all the formers.  Noted that separator should have higher
     * precedence than header or data.
     *   |  state  | caption separator header data empty | --> lower precedence
     *   | 0x10100 |    1        0       1     0     0   |
     */
    var tableDFA = new DFA(),
        grp = 0x10, mtr = -1,
        token, tableToken, trToken,
        colspan, leftToken,
        rowspan, upTokens = [],
        tableLines, tgroupLines,
        tag, text, range, r, c, b, t,
        blockState;

    if (startLine + 2 > endLine) { return false; }

    /**
     * First pass: validate and collect info into table token. IR is stored in
     * markdown-it `token.meta` to be pushed later. table/tr open tokens are
     * generated here.
     */
    tableToken       = new state.Token('table_open', 'table', 1);
    tableToken.meta  = { sep: null, cap: null, tr: [] };

    tableDFA.set_highest_alphabet(0x10000);
    tableDFA.set_initial_state(0x10100);
    tableDFA.set_accept_states([ 0x10010, 0x10011, 0x00000 ]);
    tableDFA.set_match_alphabets({
      0x10000: table_caption.bind(this, state, true),
      0x01000: table_separator.bind(this, state, true),
      0x00100: table_row.bind(this, state, true),
      0x00010: table_row.bind(this, state, true),
      0x00001: table_empty.bind(this, state, true)
    });
    tableDFA.set_transitions({
      0x10100: { 0x10000: 0x00100, 0x00100: 0x01100 },
      0x00100: { 0x00100: 0x01100 },
      0x01100: { 0x01000: 0x10010, 0x00100: 0x01100 },
      0x10010: { 0x10000: 0x00000, 0x00010: 0x10011 },
      0x10011: { 0x10000: 0x00000, 0x00010: 0x10011, 0x00001: 0x10010 }
    });
    if (options.headerless) {
      tableDFA.set_initial_state(0x11100);
      tableDFA.update_transition(0x11100,
        { 0x10000: 0x01100, 0x01000: 0x10010, 0x00100: 0x01100 }
      );
      trToken      = new state.Token('tr_placeholder', 'tr', 0);
      trToken.meta = Object();  // avoid trToken.meta.grp throws exception
    }
    if (!options.multibody) {
      tableDFA.update_transition(0x10010,
        { 0x10000: 0x00000, 0x00010: 0x10010 }  // 0x10011 is never reached
      );
    }
    /* Don't mix up DFA `_state` and markdown-it `state` */
    tableDFA.set_actions(function (_line, _state, _type) {
      // console.log(_line, _state.toString(16), _type.toString(16))  // for test
      switch (_type) {
        case 0x10000:
          if (tableToken.meta.cap) { break; }
          tableToken.meta.cap       = table_caption(state, false, _line);
          tableToken.meta.cap.map   = [ _line, _line + 1 ];
          tableToken.meta.cap.first = (_line === startLine);
          break;
        case 0x01000:
          tableToken.meta.sep     = table_separator(state, false, _line);
          tableToken.meta.sep.map = [ _line, _line + 1 ];
          trToken.meta.grp |= 0x01;  // previously assigned at case 0x00110
          grp               = 0x10;
          break;
        case 0x00100:
        case 0x00010:
          trToken           = new state.Token('tr_open', 'tr', 1);
          trToken.map       = [ _line, _line + 1 ];
          trToken.meta      = table_row(state, false, _line);
          trToken.meta.type = _type;
          trToken.meta.grp  = grp;
          grp               = 0x00;
          tableToken.meta.tr.push(trToken);
          /* Multiline. Merge trTokens as an entire multiline trToken */
          if (options.multiline) {
            if (trToken.meta.multiline && mtr < 0) {
              /* Start line of multiline row. mark this trToken */
              mtr = tableToken.meta.tr.length - 1;
            } else if (!trToken.meta.multiline && mtr >= 0) {
              /* End line of multiline row. merge forward until the marked trToken */
              token               = tableToken.meta.tr[mtr];
              token.meta.mbounds  = tableToken.meta.tr
                .slice(mtr).map(function (tk) { return tk.meta.bounds; });
              token.map[1]        = trToken.map[1];
              tableToken.meta.tr  = tableToken.meta.tr.slice(0, mtr + 1);
              mtr = -1;
            }
          }
          break;
        case 0x00001:
          trToken.meta.grp |= 0x01;
          grp               = 0x10;
          break;
      }
    });

    if (tableDFA.execute(startLine, endLine) === false) { return false; }
    // if (!tableToken.meta.sep) { return false; } // always evaluated true
    if (!tableToken.meta.tr.length) { return false; } // false under headerless corner case
    if (silent) { return true; }

    /* Last data row cannot be detected. not stored to trToken outside? */
    tableToken.meta.tr[tableToken.meta.tr.length - 1].meta.grp |= 0x01;


    /**
     * Second pass: actually push the tokens into `state.tokens`.
     * thead/tbody/th/td open tokens and all closed tokens are generated here;
     * thead/tbody are generally called tgroup; td/th are generally called tcol.
     */
    tableToken.map   = tableLines = [ startLine, 0 ];
    tableToken.block = true;
    tableToken.level = state.level++;
    state.tokens.push(tableToken);

    if (tableToken.meta.cap) {
      token          = state.push('caption_open', 'caption', 1);
      token.map      = tableToken.meta.cap.map;

      var attrs      = [];
      var capSide    = tableToken.meta.cap.first ? 'top' : 'bottom';

      /* Null is possible when disabled the option autolabel */
      if (tableToken.meta.cap.label !== null) {
        attrs.push([ 'id', tableToken.meta.cap.label ]);
      }

      /* Add caption-side inline-CSS to <caption> tag, if caption is below the markdown table. */
      if (capSide !== 'top') {
        attrs.push([ 'style', 'caption-side: ' + capSide ]);
      }

      token.attrs    = attrs;

      token          = state.push('inline', '', 0);
      token.content  = tableToken.meta.cap.text;
      token.map      = tableToken.meta.cap.map;
      token.children = [];

      token          = state.push('caption_close', 'caption', -1);
    }

    for (r = 0; r < tableToken.meta.tr.length; r++) {
      leftToken = new state.Token('td_th_placeholder', '', 0);

      /* Push in thead/tbody and tr open tokens */
      trToken = tableToken.meta.tr[r];
      // console.log(trToken.meta); // for test
      if (trToken.meta.grp & 0x10) {
        tag = (trToken.meta.type === 0x00100) ? 'thead' : 'tbody';
        token     = state.push(tag + '_open', tag, 1);
        token.map = tgroupLines = [ trToken.map[0], 0 ];  // array ref
        upTokens  = [];
      }
      trToken.block = true;
      trToken.level = state.level++;
      state.tokens.push(trToken);

      /* Push in th/td tokens */
      for (c = 0; c < trToken.meta.bounds.length - 1; c++) {
        range = [ trToken.meta.bounds[c] + 1, trToken.meta.bounds[c + 1] ];
        text = state.src.slice.apply(state.src, range);

        if (text === '') {
          colspan = leftToken.attrGet('colspan');
          leftToken.attrSet('colspan', colspan === null ? 2 : colspan + 1);
          continue;
        }
        if (options.rowspan && upTokens[c] && text.trim() === '^^') {
          rowspan = upTokens[c].attrGet('rowspan');
          upTokens[c].attrSet('rowspan', rowspan === null ? 2 : rowspan + 1);
          leftToken = new state.Token('td_th_placeholder', '', 0);
          continue;
        }

        tag = (trToken.meta.type === 0x00100) ? 'th' : 'td';
        token       = state.push(tag + '_open', tag, 1);
        token.map   = trToken.map;
        token.attrs = [];
        if (tableToken.meta.sep.aligns[c]) {
          token.attrs.push([ 'style', 'text-align:' + tableToken.meta.sep.aligns[c] ]);
        }
        if (tableToken.meta.sep.wraps[c]) {
          token.attrs.push([ 'class', 'extend' ]);
        }

        leftToken = upTokens[c] = token;

        /* Multiline. Join the text and feed into markdown-it blockParser. */
        if (options.multiline && trToken.meta.multiline && trToken.meta.mbounds) {
          // Pad the text with empty lines to ensure the line number mapping is correct
          text = new Array(trToken.map[0]).fill('').concat([ text.trimRight() ]);
          for (b = 1; b < trToken.meta.mbounds.length; b++) {
            /* Line with N bounds has cells indexed from 0 to N-2 */
            if (c > trToken.meta.mbounds[b].length - 2) { continue; }
            range = [ trToken.meta.mbounds[b][c] + 1, trToken.meta.mbounds[b][c + 1] ];
            text.push(state.src.slice.apply(state.src, range).trimRight());
          }
          blockState = new state.md.block.State(text.join('\n'), state.md, state.env, []);
          blockState.level = trToken.level + 1;
          // Start tokenizing from the actual content (trToken.map[0])
          state.md.block.tokenize(blockState, trToken.map[0], blockState.lineMax);
          for (t = 0; t < blockState.tokens.length; t++) {
            state.tokens.push(blockState.tokens[t]);
          }
        } else {
          token          = state.push('inline', '', 0);
          token.content  = text.trim();
          token.map      = trToken.map;
          token.level    = trToken.level + 1;
          token.children = [];
        }

        token = state.push(tag + '_close', tag, -1);
      }

      /* Push in tr and thead/tbody closed tokens */
      state.push('tr_close', 'tr', -1);
      if (trToken.meta.grp & 0x01) {
        tag = (trToken.meta.type === 0x00100) ? 'thead' : 'tbody';
        token = state.push(tag + '_close', tag, -1);
        tgroupLines[1] = trToken.map[1];
      }
    }

    tableLines[1] = Math.max(
      tgroupLines[1],
      tableToken.meta.sep.map[1],
      tableToken.meta.cap ? tableToken.meta.cap.map[1] : -1
    );
    token = state.push('table_close', 'table', -1);

    state.line = tableLines[1];
    return true;
  }

  md.block.ruler.at('table', table, { alt: [ 'paragraph', 'reference' ] });
};

/* vim: set ts=2 sw=2 et: */
