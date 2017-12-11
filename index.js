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
      lastPos = 0,
      escaped = false,
      backTicked = false;

    for (pos = 0; pos < max; pos++) {
      switch (str.charCodeAt(pos)) {
        case 0x5c/* \ */:
          escaped = true;
          break;
        case 0x60/* ` */:
          if (backTicked || !escaped) {
            // make \` close code sequence, but not open it;
            // the reason is: `\` is correct code block
            backTicked = !backTicked;
          }
          escaped = false;
          break;
        case 0x7c/* | */:
          if (!backTicked && !escaped) {
            result.push(str.slice(lastPos, pos));
            lastPos = pos + 1;
          }
          escaped = false;
          break;
        default:
          escaped = false;
          break;
      }
    }

    result.push(str.slice(lastPos));

    return result;
  }

  function countColspan(columns) {
    var i, emptyCount, colspans;

    emptyCount = 0;
    colspans = [];
    for (i = columns.length - 1; i >= 0; i--) {
      if (columns[i]) {
        colspans.unshift(emptyCount + 1);
        emptyCount = 0;
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      colspans.unshift(emptyCount + 1);
    }

    return colspans;
  }

  function caption(state, lineText, lineNum, silent) {
    var captionInfo, result, token;

    result = lineText.match(/^\[([^[\]]+)\](\[([^[\]]+)\])?\s*$/);
    if (!result) { return false; }
    if (silent) { return true; }

    captionInfo = { caption: null, label: null };
    captionInfo.content = result[1];
    captionInfo.label = result[2] || result[1];

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

  function tableRow(state, lineText, lineNum, silent, seperatorInfo, rowType) {
    var rowInfo, columns, token, i, col;

    columns = escapedSplit(lineText.replace(/^\||([^\\])\|$/g, '$1'));
    // lineText does not contain valid pipe character
    if (columns.length === 1 && !/^\||[^\\]\|$/.test(lineText)) { return false; }
    if (silent) { return true; }
      // console.log(lineText + ': ' + columns.length);

    rowInfo = { colspans: null, columns: null };
    rowInfo.columns = columns.filter(Boolean);
    rowInfo.colspans = countColspan(columns);

    token     = state.push('tr_open', 'tr', 1);
    token.map = [ lineNum, lineNum + 1 ];

    for (i = 0, col = 0; i < rowInfo.columns.length && col < seperatorInfo.aligns.length;
       col += rowInfo.colspans[i], i++) {
      // console.log(col)
      token          = state.push(rowType + '_open', rowType, 1);
      token.map      = [ lineNum, lineNum + 1 ];
      token.attrs    = [];
      if (seperatorInfo.aligns[col]) {
        token.attrs.push([ 'style', 'text-align:' + seperatorInfo.aligns[col] ]);
      }
      if (seperatorInfo.wraps[col]) {
        token.attrs.push([ 'class', 'extend' ]);
      }
      if (rowInfo.colspans[i] > 1) {
        token.attrs.push([ 'colspan', rowInfo.colspans[i] ]);
      }

      token          = state.push('inline', '', 0);
      token.content  = rowInfo.columns[i].trim();
      token.map      = [ lineNum, lineNum + 1 ];
      token.children = [];

      token          = state.push(rowType + '_close', rowType, -1);
    }

    token     = state.push('tr_close', 'tr', -1);

    return rowInfo;
  }

  function seperator(state, lineText, lineNum, silent) {
    var columns, seperatorInfo, i, t;

    // lineText have code indentation
    if (state.sCount[lineNum] - state.blkIndent >= 4) { return false; }

    // lineText does not contain valid pipe character
    columns = escapedSplit(lineText.replace(/^\||([^\\])\|$/g, '$1'));
    if (columns.length === 1 && !/^\||[^\\]\|$/.test(lineText)) { return false; }

    seperatorInfo = { aligns: [], wraps: [] };

    for (i = 0; i < columns.length; i++) {
      t = columns[i].trim();
      // console.log(t);
      if (!/^:?(-+|=+):?\+?$/.test(t)) { return false; }

      seperatorInfo.wraps.push(t.charCodeAt(t.length - 1) === 0x2B/* + */);
      if (seperatorInfo.wraps[i]) { t = t.slice(0, -1); }

      switch (((t.charCodeAt(0)            === 0x3A/* : */) << 4) +
           (t.charCodeAt(t.length - 1) === 0x3A/* : */)) {
        case 0x00: seperatorInfo.aligns.push('');       break;
        case 0x01: seperatorInfo.aligns.push('right');  break;
        case 0x10: seperatorInfo.aligns.push('left');   break;
        case 0x11: seperatorInfo.aligns.push('center'); break;
      }
    }

    return silent || seperatorInfo;
  }

  function table(state, startLine, endLine, silent) {
    // Regex pseudo code for table:
    // caption? tableRow+ seperator (tableRow+ | empty)* caption?
    var seperatorLine, captionAtFirst, captionAtLast, lineText, nextLine,
      seperatorInfo, token, tableLines,
      tbodyLines, emptyTBody;

    if (startLine + 2 > endLine) { return false; }

    captionAtFirst = captionAtLast = false;

    // first line
    lineText = getLine(state, startLine).trim();
    if (caption(state, lineText, startLine, true)) {
      captionAtFirst = true;
    } else if (!tableRow(state, lineText, startLine, true, null, 'tr')) {
      return false;
    }

    // second line ~ seperator line
    for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
      lineText = getLine(state, nextLine).trim();
      if (seperator(state, lineText, nextLine, true)) {
        seperatorLine = nextLine;
        break;
      } else if (tableRow(state, lineText, nextLine, true, null, 'th')) {
        continue;
      } else {
        return false;
      }
    }
    if (!seperatorLine) { return false; }
    if (silent) { return true; }

    token = state.push('table_open', 'table', 1);
    token.map = tableLines = [ startLine, 0 ];

    seperatorInfo = seperator(state, lineText, seperatorLine, false);

    if (captionAtFirst) {
      lineText = getLine(state, startLine).trim();
      caption(state, lineText, startLine, false);
    }

    token     = state.push('thead_open', 'thead', 1);
    token.map = [ startLine + captionAtFirst, seperatorLine ];

    for (nextLine = startLine + captionAtFirst; nextLine < seperatorLine; nextLine++) {

      lineText = getLine(state, nextLine).trim();
      tableRow(state, lineText, nextLine, false, seperatorInfo, 'th');
    }

    token     = state.push('thead_close', 'thead', -1);

    emptyTBody = true;

    token     = state.push('tbody_open', 'tbody', 1);
    token.map = tbodyLines = [ seperatorLine + 1, 0 ];

    for (nextLine = seperatorLine + 1; nextLine < endLine; nextLine++) {
      lineText = getLine(state, nextLine).trim();

      if (!captionAtFirst && caption(state, lineText, nextLine, true)) {
        captionAtLast = true;
        break;
      } else if (tableRow(state, lineText, nextLine, false, seperatorInfo, 'td')) {
        emptyTBody = false;
      } else if (!emptyTBody && !lineText) {
        tbodyLines[1] = nextLine - 1;
        token     = state.push('tbody_close', 'tbody', -1);
        token     = state.push('tbody_open', 'tbody', 1);
        token.map = tbodyLines = [ nextLine + 1, 0 ];
        emptyTBody = true;
      } else {
        break;
      }
    }
    token = state.push('tbody_close', 'tbody', -1);

    if (captionAtLast) {
      caption(state, lineText, nextLine, false);
      nextLine++;
    }

    token = state.push('table_close', 'table', -1);

    tableLines[1] = tbodyLines[1] = nextLine;
    state.line = nextLine;
    return true;
  }

  md.block.ruler.at('table', table, { alt: [ 'paragraph', 'reference' ] });
};

/* vim: set ts=2 sw=2 et: */
