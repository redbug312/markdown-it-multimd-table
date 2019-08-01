'use strict';
var NFA = require('./lib/nfa.js');

module.exports = function multimd_table_plugin(md/*, options */) {
  // options = options || {};

  function scan_bound_indices(state, line) {
    var start = state.bMarks[line] + state.tShift[line],
        max = state.eMarks[line],
        bounds = [],
        escape = false, code = false;

    /* Scan for valid pipe character position */
    for (var pos = start; pos < max; pos++) {
      switch (state.src.charCodeAt(pos)) {
        case 0x5c /* \ */:
          escape = true; break;
        case 0x60 /* ` */:
          /* make \` closes the code sequence, but not open it;
             the reason is that `\` is correct code block */
          if (code || !escape) { code = !code; }
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
    if (bounds[0] > start) { bounds.unshift(start - 1); }
    if (bounds[bounds.length - 1] < max - 1) { bounds.push(max); }

    return bounds;
  }

  function table_caption(state, line, silent) {
    var start = state.bMarks[line] + state.tShift[line],
        max = state.eMarks[line],
        capRE = /^\[([^\[\]]+)\](\[([^\[\]]+)\])?\s*$/,
        matches = state.src.slice(start, max).match(capRE),
        meta = {};

    if (!matches) { return false; }
    if (silent)  { return true; }
    // TODO eliminate capRE by simple checking

    meta.text = matches[1];
    meta.label = matches[2] || matches[1];
    meta.label = meta.label.toLowerCase().replace(/\W+/g, '');

    return meta;
  }

  function appendRowToken(state, content, startLine, endLine) {
    var linesCount, blockParser, tmpState, token;
    linesCount = content.split(/\n/).length;

    if (linesCount > 1) {
      // Multiline content => subparsing as a block to support lists
      blockParser = state.md.block;
      tmpState = new blockParser.State(content, state.md, state.env, state.tokens);
      blockParser.tokenize(tmpState, 0, linesCount); // appends to state.tokens
    } else {
      token          = state.push('inline', '', 0);
      token.content  = content;
      token.map      = [ startLine, endLine ];
      token.children = [];
    }
  }

  function table_row(state, line, silent) {
    var bounds = scan_bound_indices(state, line);
    if (bounds.length === 0) { return false; }
    if (silent) { return true; }

    return { bounds: bounds };
  }

  function table_separator(state, line, silent) {
    var bounds = scan_bound_indices(state, line),
        meta = { aligns: [], wraps: [] },
        sepRE = /^:?(-+|=+):?\+?$/,
        c, text, align;

    /* Only separator needs to check indents */
    if (state.sCount[line] - state.blkIndent >= 4) { return false; }

    if (bounds.length === 0) { return false; }

    for (c = 0; c < bounds.length - 1; c++) {
      text = state.src.slice(bounds[c] + 1, bounds[c + 1]).trim();
      if (!sepRE.test(text)) { return false; }

      meta.wraps.push(text.charCodeAt(text.length - 1) === 0x2B/* + */);
      align = ((text.charCodeAt(0) === 0x3A/* : */) << 4) +
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

  function table_empty(state, line/*, silent*/) {
    var start = state.bMarks[line] + state.tShift[line],
        max = state.eMarks[line];
    return start === max;
  }

  function table(state, startLine, endLine, silent) {
    /* Regex pseudo code for table:
     * caption? header+ separator (data+ empty)* data+ caption?
     *
     * We use NFA with precedences to emulate this plugin.
     * Noted that separator should have higher precedence than header or data.
     *   |  state  | caption separator header data empty | --> lower precedence
     *   | 0x10100 |    1        0       1     0     0   |
     */
    if (startLine + 2 > endLine) { return false; }

    /**
     * First pass: validate and collect info into table token.
     * IR is stored in markdown-it token.meta to be pushed later.
     * table/tr open tokens are generated here.
     */
    var tableNFA = new NFA(),
        token, tableToken, trToken,
        tableLines, tgroupLines,
        tr, tcol, tag, text;

    tableToken       = new state.Token('table_open', 'table', 1);
    tableToken.meta  = { sep: null, cap: null, grp: 0x10, tr: [] };

    tableNFA.set_highest_alphabet(0x10000);
    tableNFA.set_start_state(0x10100);
    tableNFA.set_accept_states([ 0x10010, 0x10011, 0x00000 ]);
    tableNFA.set_match_alphabets({
      0x10000: function (_line) { return table_caption(state, _line, true); },
      0x01000: function (_line) { return table_separator(state, _line, true); },
      0x00100: function (_line) { return table_row(state, _line, true); },
      0x00010: function (_line) { return table_row(state, _line, true); },
      0x00001: function (_line) { return table_empty(state, _line, true); }
    });
    tableNFA.set_transitions({
      0x10100: { 0x10000: 0x00100, 0x00100: 0x01100 },
      0x00100: { 0x00100: 0x01100 },
      0x01100: { 0x01000: 0x10010, 0x00100: 0x01100 },
      0x10010: { 0x10000: 0x00000, 0x00010: 0x10011 },
      0x10011: { 0x10000: 0x00000, 0x00010: 0x10011, 0x00001: 0x10010 }
    });
    /* Don't mix up NFA `_state` and markdown-it `state` */
    tableNFA.set_actions(function (_line, _state, _type) {
      switch (_type) {
        case 0x10000:
          if (tableToken.meta.cap) { break; }
          tableToken.meta.cap       = table_caption(state, _line, false);
          tableToken.meta.cap.map   = [ _line, _line + 1 ];
          tableToken.meta.cap.first = (_line === startLine);
          break;
        case 0x01000:
          if (silent) { tableNFA.accept(); }
          tableToken.meta.sep     = table_separator(state, _line, false);
          tableToken.meta.sep.map = [ _line, _line + 1 ];
          tableToken.meta.tr[tableToken.meta.tr.length - 1].meta.grp |= 0x01;
          tableToken.meta.grp = 0x10;
          break;
        case 0x00100:
        case 0x00010:
          trToken           = new state.Token('table_row_open', 'tr', 1);
          trToken.meta      = table_row(state, _line, false);
          trToken.meta.type = _type;
          trToken.meta.map  = [ _line, _line + 1 ];
          trToken.meta.grp  = tableToken.meta.grp;
          tableToken.meta.tr.push(trToken);
          tableToken.meta.grp = 0x00;
          break;
        case 0x00001:
          tableToken.meta.tr[tableToken.meta.tr.length - 1].meta.grp |= 0x01;
          tableToken.meta.grp = 0x10;
          break;
        case 0x00000:
          if (_state & 0x00100) { tableNFA.reject(); } // separator not reached
      }
    });

    if (tableNFA.execute(startLine, endLine) === false) { return false; }
    if (!tableToken.meta.sep) { return false; }
    if (silent) { return true; }

    /* XXX The last data row cannot be detected? */
    tableToken.meta.tr[tableToken.meta.tr.length - 1].meta.grp |= 0x01;

    /**
     * Second pass: actually push the tokens into state.tokens.
     * thead/tbody/th/td open tokens and all closed tokens are generated here.
     * thead/tbody are generally called tgroup; td/th are generally called tcol.
     */

    tableToken.block = true;
    tableToken.level = state.level++;
    tableToken.map   = tableLines = [ startLine, 0 ];
    state.tokens.push(tableToken);

    if (tableToken.meta.cap) {
      token          = state.push('caption_open', 'caption', 1);
      token.map      = tableToken.meta.cap.map;
      token.attrs    = [ [ 'id', tableToken.meta.cap.label ] ];

      token          = state.push('inline', '', 0);
      token.content  = tableToken.meta.cap.text;
      token.map      = tableToken.meta.cap.map;
      token.children = [];

      token         = state.push('caption_close', 'caption', -1);
    }

    var leftToken, colspan, tcolPos;

    for (tr = 0; tr < tableToken.meta.tr.length; tr++) {
      leftToken = new state.Token('table_fake_tcol_open', '', 1);

      /* Push in thead/tbody and tr open tokens */
      trToken = tableToken.meta.tr[tr];
      if (trToken.meta.grp & 0x10) {
        tag = (trToken.meta.type === 0x00100) ? 'thead' : 'tbody';
        token     = state.push('table_group_open', tag, 1);
        token.map = tgroupLines = [ trToken.meta.map[0], 0 ];
      }
      trToken.block = true;
      trToken.level = state.level++;
      state.tokens.push(trToken);

      /* Push in th/td tokens */
      for (tcol = 0; tcol < trToken.meta.bounds.length - 1; tcol++) {
        tcolPos = [ trToken.meta.bounds[tcol] + 1, trToken.meta.bounds[tcol + 1] ];
        text = state.src.slice.apply(state.src, tcolPos).trim();

        /* Colspan. Not use "whether text is empty" since it's already trimmed. */
        if (tcolPos[0] === tcolPos[1]) {
          colspan = leftToken.attrGet('colspan');
          leftToken.attrSet('colspan', colspan === null ? 2 : colspan + 1);
          continue;
        }

        tag = (trToken.meta.type === 0x00100) ? 'th' : 'td';
        token       = state.push('table_column_open', tag, 1);
        token.map   = trToken.meta.map;
        token.attrs = [];
        if (tableToken.meta.sep.aligns[tcol]) {
          token.attrs.push([ 'style', 'text-align:' + tableToken.meta.sep.aligns[tcol] ]);
        }
        if (tableToken.meta.sep.wraps[tcol]) {
          token.attrs.push([ 'class', 'extend' ]);
        }
        leftToken = token;

        appendRowToken(state, text, trToken.meta.map[0], trToken.meta.map[1]);

        token     = state.push('table_column_close', tag, -1);
      }

      /* Push in tr and thead/tbody closed tokens */
      state.push('tr_close', 'tr', -1);
      if (trToken.meta.grp & 0x01) {
        tag = (trToken.meta.type === 0x00100) ? 'thead' : 'tbody';
        token = state.push('table_group_close', tag, -1);
        tgroupLines[1] = trToken.meta.map[1];
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
