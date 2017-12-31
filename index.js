'use strict';

module.exports = function multimd_table_plugin(md, pluginOptions) {
  pluginOptions = pluginOptions || {};

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
    if (silent)  { return true; }

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

  function tableRow(state, lineText, lineNum, silent, separatorInfo, rowType) {
    var rowInfo, columns, nextLineText, nextColumn, token, i, col, isValidColumn;
    rowInfo = { colspans: null, columns: null, extractedTextLinesCount: 1 };

    columns = escapedSplit(lineText.replace(/^\||([^\\])\|$/g, '$1'));
    // lineText does not contain valid pipe character
    if (columns.length === 1 && !/^\||[^\\]\|$/.test(lineText)) { return false; }
    if (silent) { return true; }

    while (pluginOptions.enableMultilineRows && columns[columns.length - 1].slice(-1) === '\\') {
      columns[columns.length - 1] = columns[columns.length - 1].slice(0, -1);
      nextLineText = getLine(state, lineNum + rowInfo.extractedTextLinesCount);
      nextColumn = escapedSplit(nextLineText.replace(/^\||([^\\])\|$/g, '$1'));
      if (nextColumn.length === 1 && !/^\||[^\\]\|$/.test(nextLineText)) { return false; }
      if (nextColumn.length !== columns.length && nextColumn.length !== columns.length - 1) { return false; }
      for (i = 0; i < nextColumn.length; i++) {
        columns[i] = columns[i].trim() + '\n' + nextColumn[i].trim();
      }
      rowInfo.extractedTextLinesCount += 1;
    }

    isValidColumn = RegExp.prototype.test.bind(/[^\n]/); // = (s => /[^\n]/.test(s))
    rowInfo.columns = columns.filter(isValidColumn);
    rowInfo.colspans = countColspan(columns.map(isValidColumn));

    token     = state.push('tr_open', 'tr', 1);
    token.map = [ lineNum, lineNum + rowInfo.extractedTextLinesCount ];

    for (i = 0, col = 0; i < rowInfo.columns.length && col < separatorInfo.aligns.length;
                         col += rowInfo.colspans[i], i++) {
      token          = state.push(rowType + '_open', rowType, 1);
      token.map      = [ lineNum, lineNum + rowInfo.extractedTextLinesCount ];
      token.attrs    = [];
      if (separatorInfo.aligns[col]) {
        token.attrs.push([ 'style', 'text-align:' + separatorInfo.aligns[col] ]);
      }
      if (separatorInfo.wraps[col]) {
        token.attrs.push([ 'class', 'extend' ]);
      }
      if (rowInfo.colspans[i] > 1) {
        token.attrs.push([ 'colspan', rowInfo.colspans[i] ]);
      }

      appendRowToken(state, rowInfo.columns[i].trim(), lineNum, lineNum + rowInfo.extractedTextLinesCount);

      token          = state.push(rowType + '_close', rowType, -1);
    }

    state.push('tr_close', 'tr', -1);

    return rowInfo;
  }

  function separator(state, lineText, lineNum, silent) {
    var columns, separatorInfo, i, t;

    // lineText have code indentation
    if (state.sCount[lineNum] - state.blkIndent >= 4) { return false; }

    // lineText does not contain valid pipe character
    columns = escapedSplit(lineText.replace(/^\||([^\\])\|$/g, '$1'));
    if (columns.length === 1 && !/^\||[^\\]\|$/.test(lineText)) { return false; }

    separatorInfo = { aligns: [], wraps: [] };

    for (i = 0; i < columns.length; i++) {
      t = columns[i].trim();
      if (!/^:?(-+|=+):?\+?$/.test(t)) { return false; }

      separatorInfo.wraps.push(t.charCodeAt(t.length - 1) === 0x2B/* + */);
      if (separatorInfo.wraps[i]) {
        t = t.slice(0, -1);
      }

      switch (((t.charCodeAt(0)            === 0x3A/* : */) << 4) +
               (t.charCodeAt(t.length - 1) === 0x3A/* : */)) {
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
     * caption? tableRow+ separator (tableRow+ | empty)* caption?
     */
    var separatorLine, captionAtFirst, captionAtLast, lineText, nextLine,
        rowInfo, separatorInfo, token, tableLines, tbodyLines, emptyTBody;

    if (startLine + 2 > endLine) { return false; }

    captionAtFirst = captionAtLast = false;

    // first line
    lineText = getLine(state, startLine).trim();
    if (caption(state, lineText, startLine, true)) {
      captionAtFirst = true;
    } else if (!tableRow(state, lineText, startLine, true, null, 'tr')) {
      return false;
    }

    // second line ~ separator line
    for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
      lineText = getLine(state, nextLine).trim();

      if (separator(state, lineText, nextLine, true)) {
        separatorLine = nextLine;
        break;
      } else if (!tableRow(state, lineText, nextLine, true, null, 'th')) {
        return false;
      }
    }
    if (!separatorLine) { return false; }
    if (silent) { return true; }

    token = state.push('table_open', 'table', 1);
    token.map = tableLines = [ startLine, 0 ];

    separatorInfo = separator(state, lineText, separatorLine, false);

    if (captionAtFirst) {
      lineText = getLine(state, startLine).trim();
      caption(state, lineText, startLine, false);
    }

    token     = state.push('thead_open', 'thead', 1);
    token.map = [ startLine + captionAtFirst, separatorLine ];

    nextLine = startLine + captionAtFirst;
    while (nextLine < separatorLine) {
      lineText = getLine(state, nextLine).trim();
      rowInfo = tableRow(state, lineText, nextLine, false, separatorInfo, 'th');
      nextLine += rowInfo.extractedTextLinesCount;
    }

    token     = state.push('thead_close', 'thead', -1);

    token     = state.push('tbody_open', 'tbody', 1);
    token.map = tbodyLines = [ separatorLine + 1, 0 ];
    emptyTBody = true;

    nextLine = separatorLine + 1;
    while (nextLine < endLine) {
      lineText = getLine(state, nextLine).trim();

      if (!captionAtFirst && caption(state, lineText, nextLine, true)) {
        captionAtLast = true;
        break;
      } else {
        rowInfo = tableRow(state, lineText, nextLine, false, separatorInfo, 'td');
        if (rowInfo) {
          emptyTBody = false;
          nextLine += rowInfo.extractedTextLinesCount;
        } else if (!emptyTBody && !lineText) {
          tbodyLines[1] = nextLine - 1;
          token     = state.push('tbody_close', 'tbody', -1);
          token     = state.push('tbody_open', 'tbody', 1);
          token.map = tbodyLines = [ nextLine + 1, 0 ];
          emptyTBody = true;
          nextLine += 1;
        } else {
          break;
        }
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
