import assert from 'node:assert/strict'
import generate from 'markdown-it-testgen'
import markdownit from 'markdown-it'
import { fileURLToPath } from 'node:url'

import multimd_table from '../index.mjs'

describe('markdown-it-multimd-table-standard', function () {
  const md = markdownit().use(multimd_table)
  const url = fileURLToPath(new URL('fixtures/standard.txt', import.meta.url))
  generate(url, { header: true }, md)
})

describe('markdown-it-multimd-table-undefined', function () {
  const md = markdownit().use(multimd_table)
  const url = fileURLToPath(new URL('fixtures/unspecified.txt', import.meta.url))
  generate(url, { header: true }, md)
})

describe('markdown-it-multimd-table-optional', function () {
  const md = markdownit().use(multimd_table, {
    multiline: true,
    rowspan: true,
    headerless: true,
    multibody: false,
    autolabel: false
  })
  const url = fileURLToPath(new URL('fixtures/options.txt', import.meta.url))
  generate(url, { header: true }, md)
})

describe('markdown-it-multimd-table-regressions', function () {
  const md = markdownit().use(multimd_table, { multiline: true, rowspan: true })
  const url = fileURLToPath(new URL('fixtures/regressions.txt', import.meta.url))
  generate(url, { header: true }, md)

  it('preserves section boundaries in multiline headers', function () {
    const source = [
      '| Col | Col | \\',
      '| 1 | 2 |',
      '| ---: | :---|',
      '|1|2| \\',
      '|3|4|',
      '| ^^ |6|'
    ].join('\n')
    const types = md.parse(source, {}).map(function (token) { return token.type })

    assert.notEqual(types.indexOf('thead_close'), -1)
    assert.ok(types.indexOf('thead_close') < types.indexOf('tbody_open'))
    for (const type of ['thead', 'tbody', 'tr']) {
      assert.equal(
        types.filter(function (value) { return value === `${type}_open` }).length,
        types.filter(function (value) { return value === `${type}_close` }).length
      )
    }
    assert.match(md.render(source), /<\/thead>\n<tbody>/)
  })
})
