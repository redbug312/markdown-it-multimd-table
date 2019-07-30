'use strict';
var NFA = require('./lib/nfa.js');

module.exports = function multimd_table_plugin(md/*, options */) {
  // options = options || {};

  function indices_pipes(state, line) {
    var start = state.bMarks[line] + state.tShift[line],
        max = state.eMarks[line],
        indices = [],
        escape = false, code = false;

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
          if (!code && !escape) { indices.push(pos); }
          escape = false; break;
        default:
          escape = false; break;
      }
    }
    return indices;
  }

  function table_caption(state, startLine, endLine, silent) {
    var start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine],
        captionRE = /^\[([^\[\]]+)\](\[([^\[\]]+)\])?\s*$/;
    var matches = state.src.slice(start, max).match(captionRE);
    if (startLine + 1 !== endLine) { return false; }
    if (!matches) { return false; }
    if (silent)  { return true; }
    // TODO eliminate caption RE

    var captionInfo = { caption: null, label: null };
    captionInfo.content = matches[1];
    captionInfo.label = matches[2] || matches[1];

    var token;
    token          = state.push('caption_open', 'caption', 1);
    token.map      = [ startLine, endLine ];
    token.attrs    = [ [ 'id', captionInfo.label.toLowerCase().replace(/\W+/g, '') ] ];

    token          = state.push('inline', '', 0);
    token.content  = captionInfo.content;
    token.map      = [ startLine, endLine ];
    token.children = [];

    token         = state.push('caption_close', 'caption', -1);

    return captionInfo;
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

  function table_row(state, startLine, endLine, silent, type) {
    var rowInfo;
    rowInfo = { colspans: null, columns: null, extractedTextLinesCount: 1 };
    var pipes = indices_pipes(state, startLine);

    // lineText does not contain valid pipe character
    if (pipes.length === 0) { return false; }
    if (startLine + 1 !== endLine) { return false; }
    if (silent) { return true; }

    var start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    if (pipes[0] > start) { pipes.unshift(start - 1); }          // last '\n' position
    if (pipes[pipes.length - 1] < max - 1) { pipes.push(max); }  // next '\n' position

    // TODO multiline feature

    var token = state.push('tr_open', 'tr', 1);
    token.map = [ startLine, endLine ];

    var oldToken = new state.Token('table_fake_cell', '', 0);
    for (var s = 0; s < pipes.length - 1; s++) {
      // Increment colspan counts to oldToken (last table cell)
      if (pipes[s] + 1 === pipes[s + 1]) {
        var colspan = oldToken.attrGet('colspan');
        oldToken.attrSet('colspan', colspan === null ? 2 : colspan + 1);
        continue;
      }

      token          = state.push('table_' + type + '_open', type, 1);
      token.map      = [ startLine, endLine ];
      token.attrs    = [];
      if (state.env.table.separator.aligns[s]) {
        token.attrs.push([ 'style', 'text-align:' + state.env.table.separator.aligns[s] ]);
      }
      if (state.env.table.separator.wraps[s]) {
        token.attrs.push([ 'class', 'extend' ]);
      }
      oldToken = token;

      var t = state.src.slice(pipes[s] + 1, pipes[s + 1]).trim();
      appendRowToken(state, t, startLine, endLine);

      token          = state.push('table_' + type + '_close', type, -1);
    }

    state.push('tr_close', 'tr', -1);

    return rowInfo;
  }

  function table_header_row(state, startLine, endLine, silent) {
    return table_row(state, startLine, endLine, silent, 'th');
  }

  function table_data_row(state, startLine, endLine, silent) {
    return table_row(state, startLine, endLine, silent, 'td');
  }

  function table_separator(state, startLine, endLine, silent) {
    // Indentation is checked only on separators
    if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }
    if (startLine + 1 !== endLine) { return false; }

    var pipes = indices_pipes(state, startLine);
    if (pipes.length === 0) { return false; }
    if (silent) { return true; }

    var separatorInfo = { aligns: [], wraps: [] };

    var start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    if (pipes[0] > start) { pipes.unshift(start - 1); }          // last '\n' position
    if (pipes[pipes.length - 1] < max - 1) { pipes.push(max); }  // next '\n' position

    for (var s = 0; s < pipes.length - 1; s++) {
      var t = state.src.slice(pipes[s] + 1, pipes[s + 1]).trim();
      if (!/^:?(-+|=+):?\+?$/.test(t)) { return false; }

      separatorInfo.wraps.push(t.charCodeAt(t.length - 1) === 0x2B/* + */);
      if (separatorInfo.wraps[s]) {
        t = t.slice(0, -1);
      }

      switch (((t.charCodeAt(0)            === 0x3A /* : */) << 4) +
               (t.charCodeAt(t.length - 1) === 0x3A /* : */)) {
        case 0x00: separatorInfo.aligns.push('');       break;
        case 0x01: separatorInfo.aligns.push('right');  break;
        case 0x10: separatorInfo.aligns.push('left');   break;
        case 0x11: separatorInfo.aligns.push('center'); break;
      }
    }

    return separatorInfo;
  }

  function table_empty(state, startLine/*, endLine, silent*/) {
    // Indentation is checked only on separators
    var start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];
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

    var match = {
      0x10000: function (line) { return table_caption(state, line, line + 1, true); },
      0x01000: function (line) { return table_separator(state, line, line + 1); },
      0x00100: function (line) { return table_header_row(state, line, line + 1, true); },
      0x00010: function (line) { return table_data_row(state, line, line + 1, true); },
      0x00001: function (line) { return table_empty(state, line, line + 1, true); }
    };
    var transitions = {
      0x10100: { 0x10000: 0x00100, 0x00100: 0x01100 },
      0x00100: { 0x00100: 0x01100 },
      0x01100: { 0x01000: 0x10010, 0x00100: 0x01100 },
      0x10010: { 0x10000: 0x00000, 0x00010: 0x10011 },
      0x10011: { 0x10000: 0x00000, 0x00010: 0x10011, 0x00001: 0x10010 }
    };

    /* Check validity; Gather separator informations */
    if (startLine + 2 > endLine) { return false; }

    var NFAstate, line, candidate, rowInfo;
    var tableNFA = new NFA();
    var tableInfo = { sepLine: 0, lines: [] };

    tableNFA.set_highest_alphabet(0x10000);
    tableNFA.set_start_state(0x10100);
    tableNFA.set_accept_states([ 0x10010, 0x10011, 0x00000 ]);
    tableNFA.set_match_alphabets({
      0x10000: function (_line) { return table_caption(state, _line, _line + 1, true); },
      0x01000: function (_line) { return table_separator(state, _line, _line + 1); },
      0x00100: function (_line) { return table_header_row(state, _line, _line + 1, true); },
      0x00010: function (_line) { return table_data_row(state, _line, _line + 1, true); },
      0x00001: function (_line) { return table_empty(state, _line, _line + 1, true); }
    });
    tableNFA.set_transitions({
      0x10100: { 0x10000: 0x00100, 0x00100: 0x01100 },
      0x00100: { 0x00100: 0x01100 },
      0x01100: { 0x01000: 0x10010, 0x00100: 0x01100 },
      0x10010: { 0x10000: 0x00000, 0x00010: 0x10011 },
      0x10011: { 0x10000: 0x00000, 0x00010: 0x10011, 0x00001: 0x10010 }
    });
    tableNFA.set_actions(function (_line, _state, _type) {
      switch (_type) {
        case 0x01000:
          /* Don't mix up NFA _state and markdown-it state */
          tableInfo.separator = table_separator(state, _line, _line + 1, false);
          tableInfo.lines.push({ type: _type, endLine: _line + 1 });
          if (silent) { tableNFA.accept(); }
          break;
        case 0x10000:
        case 0x00100:
        case 0x00010:
        case 0x00001:
          tableInfo.lines.push({ type: _type, endLine: _line + 1 });
          break;
        case 0x00000:
          if (_state & 0x00100) { tableNFA.reject(); } // separator not reached
      }
      // console.log(_state.toString(16), _type.toString(16));
    });

    if (tableNFA.execute(startLine, endLine) === false) { return false; }
    if (silent) { return true; }

    // console.log(tableInfo);

    /* Generate table HTML */
    var token, tableLines, theadLines, tbodyLines;
    state.env.table = tableInfo;  // rewrite global varaibles only when rendering
    // console.log(state.env.table.separator);

    token = state.push('table_open', 'table', 1);
    token.map = tableLines = [ startLine, 0 ];

    for (NFAstate = 0x10100, line = startLine; NFAstate && line < endLine; line++) {

      for (candidate = 0x10000; candidate > 0; candidate >>= 4) {
        if (NFAstate & candidate && match[candidate].call(this, line)) { break; }
      }

      switch (candidate) {
        case 0x10000:
          if (NFAstate !== 0x10100) { // the last line in table
            tbodyLines[1] = line;
            token = state.push('tbody_close', 'tbody', -1);
          }
          if (NFAstate === 0x10100 || state.env.table.lines[0].type !== 0x10000) {
            table_caption(state, line, line + 1, false);
          } else {
            line--;
          }
          break;
        case 0x01000:
          theadLines[1] = line;
          token         = state.push('thead_close', 'thead', -1);
          break;
        case 0x00100:
          if (NFAstate !== 0x01100) { // the first line in thead
            token     = state.push('thead_open', 'thead', 1);
            token.map = theadLines = [ line + 1, 0 ];
          }
          rowInfo = table_header_row(state, line, line + 1, false);
          line   += rowInfo.extractedTextLinesCount - 1;
          break;
        case 0x00010:
          if (NFAstate !== 0x10011) { // the first line in tbody
            token     = state.push('tbody_open', 'tbody', 1);
            token.map = tbodyLines = [ line + 1, 0 ];
          }
          rowInfo = table_data_row(state, line, line + 1, false);
          line   += rowInfo.extractedTextLinesCount - 1;
          break;
        case 0x00001:
          tbodyLines[1] = line;
          token         = state.push('tbody_close', 'tbody', -1);
          break;
        case 0x00000:
          line--;
          break;
      }

      NFAstate = transitions[NFAstate][candidate] || 0x00000;
    }

    if (tbodyLines && !tbodyLines[1]) { // Corner case: table without tbody or EOL
      tbodyLines[1] = line;
      token         = state.push('tbody_close', 'tbody', -1);
    }

    tableLines[1] = line;
    token = state.push('table_close', 'table', -1);

    state.line = line;
    return true;
  }

  md.block.ruler.at('table', table, { alt: [ 'paragraph', 'reference' ] });
};

/* vim: set ts=2 sw=2 et: */
