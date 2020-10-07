'use strict';

var path     = require('path');
var generate = require('markdown-it-testgen');

/* eslint-env mocha */

describe('markdown-it-multimd-table-standard', function () {
  var md = require('markdown-it')()
              .use(require('../'));
  generate(path.join(__dirname, 'fixtures/standard.txt'), {header: true}, md);
});

describe('markdown-it-multimd-table-unspecified', function () {
  var md = require('markdown-it')()
              .use(require('../'));
  generate(path.join(__dirname, 'fixtures/unspecified.txt'), {header: true}, md);
});

describe('markdown-it-multimd-table-options', function () {
  var slugify = function(text) {
      var sanitized = text.trim().toLowerCase().replace(/\s+/g, '-');
      return 'test-' + encodeURIComponent(sanitized);
  };
  var md = require('markdown-it')()
              .use(require('../'), {
                multiline:  true,
                rowspan:    true,
                headerless: true,
                slugify:    slugify,
              });
  generate(path.join(__dirname, 'fixtures/options.txt'), {header: true}, md);
});
