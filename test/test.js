'use strict'

const path     = require('path')
const generate = require('markdown-it-testgen')

const markdownit    = require('markdown-it')
const multimd_table = require('../')

/* eslint-env mocha */

describe('markdown-it-multimd-table-standard', function () {
  const md = markdownit().use(multimd_table)
  generate(path.join(__dirname, 'fixtures/standard.txt'), { header: true }, md)
})

describe('markdown-it-multimd-table-unspecified', function () {
  const md = markdownit().use(multimd_table)
  generate(path.join(__dirname, 'fixtures/unspecified.txt'), { header: true }, md)
})

describe('markdown-it-multimd-table-options', function () {
  const md = markdownit().use(multimd_table, {
    multiline: true,
    rowspan: true,
    headerless: true,
    multibody: false,
    autolabel: false
  })
  generate(path.join(__dirname, 'fixtures/options.txt'), { header: true }, md)
})
