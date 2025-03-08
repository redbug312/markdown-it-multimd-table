import generate from 'markdown-it-testgen'
import markdownit from 'markdown-it'
import { fileURLToPath } from 'node:url'

import multimd_table from '../index.mjs'

describe('markdown-it-multimd-table-standard', function () {
  const md = markdownit().use(multimd_table);
  const url = fileURLToPath(new URL('fixtures/standard.txt', import.meta.url))
  generate(url, { header: true }, md);
});

describe('markdown-it-multimd-table-undefined', function () {
  const md = markdownit().use(multimd_table);
  const url = fileURLToPath(new URL('fixtures/unspecified.txt', import.meta.url))
  generate(url, { header: true }, md);
});

describe('markdown-it-multimd-table-optional', function () {
  const md = markdownit().use(multimd_table, {
    multiline:  true,
    rowspan:    true,
    headerless: true,
    multibody:  false,
    autolabel:  false,
  });
  const url = fileURLToPath(new URL('fixtures/options.txt', import.meta.url))
  generate(url, { header: true }, md);
});
