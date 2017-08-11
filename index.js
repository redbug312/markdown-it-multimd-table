// Process definition lists
//
'use strict';

module.exports = function multimd_table_plugin(md) {
  function getLine(state, line) {
    var pos = state.bMarks[line] + state.blkIndent,
      max = state.eMarks[line];

    return state.src.slice(pos, max);
  }

  function escapedSplit(str) {
    var result = [],
      pos = 0,
      max = str.length,
      ch,
      escapes = 0,
      lastPos = 0,
      backTicked = false,
      lastBackTick = 0;

    ch = str.charCodeAt(pos);

    while (pos < max) {
      if (ch === 0x60/* ` */) {
        if (backTicked) {
          // make \` close code sequence, but not open it;
          // the reason is: `\` is correct code block
          backTicked = false;
          lastBackTick = pos;
        } else if ((escapes & 1) === 0) {
          backTicked = true;
          lastBackTick = pos;
        }
      } else if (ch === 0x7c/* | */ && (escapes & 1) === 0 && !backTicked) {
        result.push(str.slice(lastPos, pos));
        lastPos = pos + 1;
      }

      if (ch === 0x5c/* \ */) {
        escapes++;
      } else {
        escapes = 0;
      }

      pos++;

      // If there was an un-closed backtick, go back to just after
      // the last backtick, but as if it was a normal character
      if (pos === max && backTicked) {
        backTicked = false;
        pos = lastBackTick + 1;
      }

      ch = str.charCodeAt(pos);
    }

    result.push(str.slice(lastPos));

    return result;
  }

  function table(state, startLine, endLine, silent) {
    var lineText, i, seperatorLine, nextLine, columns, columnCount, token,
      aligns, wraps, t, tableLines, tbodyLines;

    // should have at least two lines
    if (startLine + 2 > endLine) { return false; }

    seperatorLine = startLine + 1;
    if (state.sCount[seperatorLine] < state.blkIndent) { return false; }
    if (state.sCount[seperatorLine] - state.blkIndent >= 4) { return false; }
    // if it's indented more than 3 spaces, it should be a code block

    lineText = getLine(state, seperatorLine);
    columns = lineText.split('|');
    if (columns.length === 1 && !/^\||[^\\]\|$/.test(lineText)) { return false; }
    aligns = [];
    wraps = [];
    for (i = 0; i < columns.length; i++) {
      t = columns[i].trim();
      if (!t) {
        // allow empty columns before and after table, but not in between columns;
        // e.g. allow ` |---| `, disallow ` ---||--- `
        if (i === 0 || i === columns.length - 1) {
          continue;
        } else {
          return false;
        }
      }

      if (!/^:?(-+|=+|\.+):?\+?$/.test(t)) { return false; }
      if (t.charCodeAt(t.length - 1) === 0x2B/* + */) {
        wraps.push(true);
        t = t.slice(0, -1);
      } else {
        wraps.push(false);
      }
      switch (((t.charCodeAt(0)            === 0x3A/* : */) << 4) +
           (t.charCodeAt(t.length - 1) === 0x3A/* : */)) {
        case 0x00: aligns.push('');       break;
        case 0x01: aligns.push('right');  break;
        case 0x10: aligns.push('left');   break;
        case 0x11: aligns.push('center'); break;
      }
    }

    lineText = getLine(state, startLine).trim();
    if (lineText.indexOf('|') === -1) { return false; }
    if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }
    columns = escapedSplit(lineText.replace(/^\||\|$/g, ''));

    // header row will define an amount of columns in the entire table,
    // and align row shouldn't be smaller than that (the rest of the rows can)
    columnCount = columns.length;
    if (columnCount > aligns.length) { return false; }
    if (columns.length === 1 && !/^\||[^\\]\|$/.test(lineText)) { return false; }

    if (silent) { return true; }

    token     = state.push('table_open', 'table', 1);
    token.map = tableLines = [ startLine, 0 ];

    token     = state.push('thead_open', 'thead', 1);
    token.map = [ startLine, startLine + 1 ];

    token     = state.push('tr_open', 'tr', 1);
    token.map = [ startLine, startLine + 1 ];

    for (i = 0; i < columns.length; i++) {
      token          = state.push('th_open', 'th', 1);
      token.map      = [ startLine, startLine + 1 ];
      token.attrs    = [];
      if (aligns[i]) {
        token.attrs.push([ 'style', 'text-align:' + aligns[i] ]);
      }
      if (wraps[i]) {
        token.attrs.push([ 'class', '.export_wrap' ]);
      }

      token          = state.push('inline', '', 0);
      token.content  = columns[i].trim();
      token.map      = [ startLine, startLine + 1 ];
      token.children = [];

      token          = state.push('th_close', 'th', -1);
    }

    token     = state.push('tr_close', 'tr', -1);
    token     = state.push('thead_close', 'thead', -1);

    token     = state.push('tbody_open', 'tbody', 1);
    token.map = tbodyLines = [ startLine + 2, 0 ];

    for (nextLine = seperatorLine + 1; nextLine < endLine; nextLine++) {
      if (state.sCount[nextLine] < state.blkIndent) { break; }

      lineText = getLine(state, nextLine).trim();
      if (lineText.indexOf('|') === -1) { break; }
      if (state.sCount[nextLine] - state.blkIndent >= 4) { break; }
      columns = escapedSplit(lineText.replace(/^\||\|$/g, ''));
      if (columns.length === 1 && !/^\||[^\\]\|$/.test(lineText)) { break; }

      token = state.push('tr_open', 'tr', 1);
      for (i = 0; i < columnCount; i++) {
        token          = state.push('td_open', 'td', 1);
        token.attrs    = [];
        if (aligns[i]) {
          token.attrs.push([ 'style', 'text-align:' + aligns[i] ]);
        }
        if (wraps[i]) {
          token.attrs.push([ 'class', '.export_wrap' ]);
        }

        token          = state.push('inline', '', 0);
        token.content  = columns[i] ? columns[i].trim() : '';
        token.children = [];

        token          = state.push('td_close', 'td', -1);
      }
      token = state.push('tr_close', 'tr', -1);
    }
    token = state.push('tbody_close', 'tbody', -1);
    token = state.push('table_close', 'table', -1);

    tableLines[1] = tbodyLines[1] = nextLine;
    state.line = nextLine;
    return true;
  }
  md.block.ruler.at('table', table, { alt: [ 'paragraph', 'reference' ] });
};
