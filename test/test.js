'use strict';

var path     = require('path');
var generate = require('markdown-it-testgen');

/* eslint-env mocha */

describe('markdown-it-multimd-table-standard', function () {
  var md = require('markdown-it')()
              .use(require('../'));
  generate(path.join(__dirname, 'fixtures/standard.txt'), {header: true}, md);
});

describe('Issues', function () {
  var md = require('markdown-it')()
              .use(require('../'));
  generate(path.join(__dirname, 'fixtures/issues.txt'), {header: true}, md);
});

describe('(optional) Multilines', function () {
  var md = require('markdown-it')()
              .use(require('../'), { enableMultilineRows: true });
  generate(path.join(__dirname, 'fixtures/multilines.txt'), {header: true}, md);
});

describe('(optional) Rowspans', function () {
  var md = require('markdown-it')()
              .use(require('../'), { enableMultilineRows: true, enableRowspan: true });
  generate(path.join(__dirname, 'fixtures/rowspan.txt'), {header: true}, md);
});
