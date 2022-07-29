'use strict';

var path     = require('path');
var generate = require('markdown-it-testgen');

var markdownit    = require('markdown-it');
var multimd_table = require('../');

/* eslint-env mocha */

describe('markdown-it-multimd-table-standard', function () {
  var md = markdownit().use(multimd_table);
  generate(path.join(__dirname, 'fixtures/standard.txt'), { header: true }, md);
});

describe('markdown-it-multimd-table-unspecified', function () {
  var md = markdownit().use(multimd_table);
  generate(path.join(__dirname, 'fixtures/unspecified.txt'), { header: true }, md);
});

describe('markdown-it-multimd-table-options', function () {
  var md = markdownit().use(multimd_table, {
    multiline:  true,
    rowspan:    true,
    headerless: true,
    multibody:  false,
    autolabel:  false,
  });
  generate(path.join(__dirname, 'fixtures/options.txt'), { header: true }, md);
});
