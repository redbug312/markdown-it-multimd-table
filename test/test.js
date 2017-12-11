'use strict';

var path     = require('path');
var generate = require('markdown-it-testgen');

/* eslint-env mocha */

describe('Basic', function () {
  var md = require('markdown-it')()
              .use(require('../'));

  generate(path.join(__dirname, 'fixtures/basic.txt'), md);
});

describe('Requirements', function () {
  var md = require('markdown-it')()
              .use(require('../'));

  generate(path.join(__dirname, 'fixtures/requirements.txt'), md);
});

describe('Other Notes', function () {
  var md = require('markdown-it')()
              .use(require('../'));

  generate(path.join(__dirname, 'fixtures/notes.txt'), md);
});

describe('Issues', function () {
  var md = require('markdown-it')()
              .use(require('../'));

  generate(path.join(__dirname, 'fixtures/issues.txt'), md);
});
