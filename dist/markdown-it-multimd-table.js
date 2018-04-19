/*! markdown-it-multimd-table 3.1.1 https://github.com//markdown-it/markdown-it-multimd-table @license MIT */(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.markdownitMultilineTbl = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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

    var NFAstate, line, tryMatch, rowInfo, lineText, separatorInfo;
    var captionAtFirst = false;

    for (NFAstate = 0x10100, line = startLine; NFAstate && line < endLine; line++) {
      lineText = getLine(state, line).trim();

      for (tryMatch = 0x10000; tryMatch > 0; tryMatch >>= 1) {
        if (NFAstate & tryMatch && match[tryMatch].call(this, state, line, lineText)) { break; }
      }

      switch (tryMatch) {
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

      NFAstate = transitions[NFAstate][tryMatch] || 0x00000;
    }

    if (!separatorInfo) { return false; }

    /* Generate table HTML */
    var token, tableLines, theadLines, tbodyLines;

    token = state.push('table_open', 'table', 1);
    token.map = tableLines = [ startLine, 0 ];

    for (NFAstate = 0x10100, line = startLine; NFAstate && line < endLine; line++) {
      lineText = getLine(state, line).trim();

      for (tryMatch = 0x10000; tryMatch > 0; tryMatch >>= 1) {
        if (NFAstate & tryMatch && match[tryMatch].call(this, state, line, lineText)) { break; }
      }

      switch (tryMatch) {
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
          }
          rowInfo = tableRow(state, lineText, line, false, separatorInfo, 'th');
          line   += rowInfo.extractedTextLinesCount - 1;
          break;
        case 0x00010:
          if (NFAstate !== 0x10011) { // the first line in tbody
            token     = state.push('tbody_open', 'tbody', 1);
            token.map = tbodyLines = [ line + 1, 0 ];
          }
          rowInfo = tableRow(state, lineText, line, false, separatorInfo, 'td');
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

      NFAstate = transitions[NFAstate][tryMatch] || 0x00000;
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

},{}]},{},[1])(1)
});
