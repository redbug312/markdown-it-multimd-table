'use strict';

module.exports = function multimd_table_plugin(md/*, options */) {
  // options = options || {};

  function getLine(state, line) {
    var pos = state.bMarks[line] + state.blkIndent,
        max = state.eMarks[line];
    return state.src.slice(pos, max);
  }

  function indices_pipes(state, line) {
    var pos = state.bMarks[line] + state.tShift[line],
        max = state.eMarks[line],
        indices = [],
        escape = false, code = false;

    for (; pos < max; pos++) {
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

  function caption(state, lineText, lineNum, silent) {
    var result = lineText.match(/^\[([^\[\]]+)\](\[([^\[\]]+)\])?\s*$/);
    if (!result) { return false; }
    if (silent)  { return true; }

    var captionInfo = { caption: null, label: null };
    captionInfo.content = result[1];
    captionInfo.label = result[2] || result[1];

    var token;
    token          = state.push('caption_open', 'caption', 1);
    token.map      = [ lineNum, lineNum + 1 ];
    token.attrs    = [ [ 'id', captionInfo.label.toLowerCase().replace(/\W+/g, '') ] ];

    token          = state.push('inline', '', 0);
    token.content  = captionInfo.content;
    token.map      = [ lineNum, lineNum + 1 ];
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

  function tableRow(state, lineText, lineNum, silent, separatorInfo, rowType, rowspanState) {
    var rowInfo;
    rowInfo = { colspans: null, columns: null, extractedTextLinesCount: 1 };
    var pipes = indices_pipes(state, lineNum);

    // lineText does not contain valid pipe character
    if (pipes.length === 0) { return false; }
    if (silent) { return true; }

    var startLine = lineNum;
    var start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    if (pipes[0] > start) { pipes.unshift(start - 1); }          // last '\n' position
    if (pipes[pipes.length - 1] < max - 1) { pipes.push(max); }  // next '\n' position

    // TODO multiline feature

    var token = state.push('tr_open', 'tr', 1);
    token.map = [ lineNum, lineNum + rowInfo.extractedTextLinesCount ];

    var oldToken = new state.Token('table_fake_cell', '', 0);
    for (var s = 0; s < pipes.length - 1; s++) {
      // Increment colspan counts to oldToken (last table cell)
      if (pipes[s] + 1 === pipes[s + 1]) {
        var colspan = oldToken.attrGet('colspan');
        oldToken.attrSet('colspan', colspan === null ? 2 : colspan + 1);
        continue;
      }

      token          = state.push(rowType + '_open', rowType, 1);
      token.map      = [ lineNum, lineNum + rowInfo.extractedTextLinesCount ];
      token.attrs    = [];
      rowspanState[s] = {
        attrs: token.attrs
      };
      if (separatorInfo.aligns[s]) {
        token.attrs.push([ 'style', 'text-align:' + separatorInfo.aligns[s] ]);
      }
      if (separatorInfo.wraps[s]) {
        token.attrs.push([ 'class', 'extend' ]);
      }
      oldToken = token;

      var t = state.src.slice(pipes[s] + 1, pipes[s + 1]).trim();
      appendRowToken(state, t, lineNum, lineNum + rowInfo.extractedTextLinesCount);

      token          = state.push(rowType + '_close', rowType, -1);
    }

    state.push('tr_close', 'tr', -1);

    return rowInfo;
  }

  function separator(state, lineText, lineNum, silent) {
    // lineText have code indentation
    if (state.sCount[lineNum] - state.blkIndent >= 4) { return false; }

    // lineText does not contain valid pipe character
    var pipes = indices_pipes(state, lineNum);
    if (pipes.length === 0) { return false; }

    var separatorInfo = { aligns: [], wraps: [] };

    var startLine = lineNum;
    var start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    if (pipes[0] > start) { pipes.unshift(start); }
    if (pipes[pipes.length - 1] < max - 1) { pipes.push(max); }

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

    return silent || separatorInfo;
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
      0x10000: function (s, l, lt) { return caption(s, lt, l, true); },
      0x01000: function (s, l, lt) { return separator(s, lt, l); },
      0x00100: function (s, l, lt) { return tableRow(s, lt, l, true, null, 'th'); },
      0x00010: function (s, l, lt) { return tableRow(s, lt, l, true, null, 'td'); },
      0x00001: function (s, l, lt) { return !lt; }
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

    var NFAstate, line, candidate, rowInfo, lineText, separatorInfo;
    var captionAtFirst = false;

    for (NFAstate = 0x10100, line = startLine; NFAstate && line < endLine; line++) {
      lineText = getLine(state, line).trim();

      for (candidate = 0x10000; candidate > 0; candidate >>= 4) {
        if (NFAstate & candidate && match[candidate].call(this, state, line, lineText)) { break; }
      }

      switch (candidate) {
        case 0x10000:
          if (NFAstate === 0x10100) { captionAtFirst = true; }
          break;
        case 0x01000:
          separatorInfo = separator(state, lineText, line);
          if (silent) { return true; }
          break;
        case 0x00100:
        case 0x00010:
        case 0x00001:
          break;
        case 0x00000:
          if (NFAstate & 0x00100) { return false; } // separator not reached
      }

      NFAstate = transitions[NFAstate][candidate] || 0x00000;
    }

    if (!separatorInfo) { return false; }

    /* Generate table HTML */
    var token, tableLines, theadLines, tbodyLines;

    token = state.push('table_open', 'table', 1);
    token.map = tableLines = [ startLine, 0 ];

    var rowspanState;
    for (NFAstate = 0x10100, line = startLine; NFAstate && line < endLine; line++) {
      lineText = getLine(state, line).trim();

      for (candidate = 0x10000; candidate > 0; candidate >>= 4) {
        if (NFAstate & candidate && match[candidate].call(this, state, line, lineText)) { break; }
      }

      switch (candidate) {
        case 0x10000:
          if (NFAstate !== 0x10100) { // the last line in table
            tbodyLines[1] = line;
            token = state.push('tbody_close', 'tbody', -1);
          }
          if (NFAstate === 0x10100 || !captionAtFirst) {
            caption(state, lineText, line, false);
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
            rowspanState = [];
          }
          rowInfo = tableRow(state, lineText, line, false, separatorInfo, 'th', rowspanState);
          line   += rowInfo.extractedTextLinesCount - 1;
          break;
        case 0x00010:
          if (NFAstate !== 0x10011) { // the first line in tbody
            token     = state.push('tbody_open', 'tbody', 1);
            token.map = tbodyLines = [ line + 1, 0 ];
            rowspanState = [];
          }
          rowInfo = tableRow(state, lineText, line, false, separatorInfo, 'td', rowspanState);
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
