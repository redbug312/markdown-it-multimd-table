[![NPM version](https://img.shields.io/npm/v/markdown-it-multimd-table.svg?style=flat)](https://www.npmjs.org/package/markdown-it-multimd-table)
[![Build Status](https://travis-ci.org/RedBug312/markdown-it-multimd-table.svg?branch=master)](https://travis-ci.org/RedBug312/markdown-it-multimd-table)
[![Coverage Status](https://coveralls.io/repos/github/RedBug312/markdown-it-multimd-table/badge.svg?branch=master)](https://coveralls.io/github/RedBug312/markdown-it-multimd-table?branch=master)

MultiMarkdown table syntax plugin for markdown-it markdown parser

## Intro

Markdown specs defines only the basics for tables. When users want common
features like `colspan`, they must fallback to raw HTML. And writing tables in
HTML is truly *lengthy and troublesome*.

This plugin extends markdown-it with MultiMarkdown table syntax.
[MultiMarkdown][mmd6] is an extended Markdown spec. It defines clear rules for
advanced Markdown table syntax, while being consistent with original pipe
table; [markdown-it][mdit] is a popular Markdown parser in JavaScript and
allows plugins extending itself.

[mmd6]: https://fletcher.github.io/MultiMarkdown-6/
[mdit]: https://markdown-it.github.io/

The features are provided:
- Cell spans over columns
- Cell spans over rows (optional)
- Divide rows into sections
- Multiple table headers
- Table caption
- Block-level elements such as lists, codes... (optional)
- Omitted table header (optional)

Noted that the plugin is not a re-written of MultiMarkdown. This plugin will
behave differently from the official compiler, but doing its best to obey rules
defined in [MultiMarkdown User's Guide][mmd6-table]. Please pose an issue if
there are weird results for sensible inputs.

[mmd6-table]: https://fletcher.github.io/MultiMarkdown-6/syntax/tables.html

## Usage

```javascript
// defaults
var md = require('markdown-it')()
            .use(require('markdown-it-multimd-table'));

// full options list (equivalent to defaults)
var md = require('markdown-it')()
            .use(require('markdown-it-multimd-table'), {
              multiline:  false,
              rowspan:    false,
              headerless: false,
            });

md.render(/*...*/)
```

For a quick demo:
```javascript
$ mkdir markdown-it-multimd-table
$ cd markdown-it-multimd-table
$ npm install markdown-it-multimd-table --prefix .
$ vim test.js

    var md = require('markdown-it')()
                .use(require('markdown-it-multimd-table'));

    const exampleTable =
    "|             |          Grouping           || \n" +
    "First Header  | Second Header | Third Header | \n" +
    " ------------ | :-----------: | -----------: | \n" +
    "Content       |          *Long Cell*        || \n" +
    "Content       |   **Cell**    |         Cell | \n" +
    "                                               \n" +
    "New section   |     More      |         Data | \n" +
    "And more      | With an escaped '\\|'       || \n" +
    "[Prototype table]                              \n";

    console.log(md.render(exampleTable));

$ node test.js > test.html
$ firefox test.html
```

Here's the table expected on browser:

<table>
<thead>
<tr>
<th></th>
<th align="center" colspan="2">Grouping</th>
</tr>
<tr>
<th>First Header</th>
<th align="center">Second Header</th>
<th align="right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content</td>
<td align="center" colspan="2"><em>Long Cell</em></td>
</tr>
<tr>
<td>Content</td>
<td align="center"><strong>Cell</strong></td>
<td align="right">Cell</td>
</tr>
</tbody>
<tbody>
<tr>
<td>New section</td>
<td align="center">More</td>
<td align="right">Data</td>
</tr>
<tr>
<td>And more</td>
<td align="center" colspan="2">With an escaped '|'</td>
</tr>
</tbody>
<caption id="prototypetable">Prototype table</caption>
</table>

Noted that GitHub filters out `style` property, so the example uses `align` the
obsolete one. However it outputs `style="text-align: ..."` in actual.

### Multiline (optional)

Backslash at end merges with line content below.<br>
Feature contributed by [Lucas-C](https://github.com/Lucas-C).

```markdown
|   Markdown   | Rendered HTML |
|--------------|---------------|
|    *Italic*  | *Italic*      | \
|              |               |
|    - Item 1  | - Item 1      | \
|    - Item 2  | - Item 2      |
|    ```python | ```python       \
|    .1 + .2   | .1 + .2         \
|    ```       | ```           |
```

This is parsed below when the option enabled:

<table>
<thead>
<tr>
<th>Markdown</th>
<th>Rendered HTML</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<pre><code>*Italic*
</code></pre>
</td>
<td>
<p><em>Italic</em></p>
</td>
</tr>
<tr>
<td>
<pre><code>- Item 1
- Item 2</code></pre>
</td>
<td>
<ul>
<li>Item 1</li>
<li>Item 2</li>
</ul>
</td>
</tr>
<tr>
<td>
<pre><code>```python
.1 + .2
```</code></pre>
</td>
<td>
<pre><code class="language-python">.1 + .2
</code></pre>
</td>
</tr>
</tbody>
</table>

### Rowspan (optional)

`^^` indicates cells being merged above.<br>
Feature contributed by [pmccloghrylaing](https://github.com/pmccloghrylaing).

```markdown
Stage | Direct Products | ATP Yields
----: | --------------: | ---------:
Glycolysis | 2 ATP ||
^^ | 2 NADH | 3--5 ATP |
Pyruvaye oxidation | 2 NADH | 5 ATP |
Citric acid cycle | 2 ATP ||
^^ | 6 NADH | 15 ATP |
^^ | 2 FADH2 | 3 ATP |
**30--32** ATP |||
[Net ATP yields per hexose]
```

This is parsed below when the option enabled:

<table>
<caption id="netatpyieldsperhexose">Net ATP yields per hexose</caption>
<thead>
<tr>
<th align="right">Stage</th>
<th align="right">Direct Products</th>
<th align="right">ATP Yields</th>
</tr>
</thead>
<tbody>
<tr>
<td align="right" rowspan="2">Glycolysis</td>
<td align="right" colspan="2">2 ATP</td>
</tr>
<tr>
<td align="right">2 NADH</td>
<td align="right">3–5 ATP</td>
</tr>
<tr>
<td align="right">Pyruvaye oxidation</td>
<td align="right">2 NADH</td>
<td align="right">5 ATP</td>
</tr>
<tr>
<td align="right" rowspan="3">Citric acid cycle</td>
<td align="right" colspan="2">2 ATP</td>
</tr>
<tr>
<td align="right">6 NADH</td>
<td align="right">15 ATP</td>
</tr>
<tr>
<td align="right">2 FADH2</td>
<td align="right">3 ATP</td>
</tr>
<tr>
<td align="right" colspan="3"><strong>30–32</strong> ATP</td>
</tr>
</tbody>
</table>

### Headerless (optional)

Table header can be eliminated.

```markdown
|--|--|--|--|--|--|--|--|
|♜|  |♝|♛|♚|♝|♞|♜|
|  |♟|♟|♟|  |♟|♟|♟|
|♟|  |♞|  |  |  |  |  |
|  |♗|  |  |♟|  |  |  |
|  |  |  |  |♙|  |  |  |
|  |  |  |  |  |♘|  |  |
|♙|♙|♙|♙|  |♙|♙|♙|
|♖|♘|♗|♕|♔|  |  |♖|
```

This is parsed below when the option enabled:

<table>
<tbody>
<tr>
<td>♜</td>
<td></td>
<td>♝</td>
<td>♛</td>
<td>♚</td>
<td>♝</td>
<td>♞</td>
<td>♜</td>
</tr>
<tr>
<td></td>
<td>♟</td>
<td>♟</td>
<td>♟</td>
<td></td>
<td>♟</td>
<td>♟</td>
<td>♟</td>
</tr>
<tr>
<td>♟</td>
<td></td>
<td>♞</td>
<td></td>
<td></td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td></td>
<td>♗</td>
<td></td>
<td></td>
<td>♟</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td></td>
<td></td>
<td></td>
<td></td>
<td>♙</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td></td>
<td></td>
<td></td>
<td></td>
<td></td>
<td>♘</td>
<td></td>
<td></td>
</tr>
<tr>
<td>♙</td>
<td>♙</td>
<td>♙</td>
<td>♙</td>
<td></td>
<td>♙</td>
<td>♙</td>
<td>♙</td>
</tr>
<tr>
<td>♖</td>
<td>♘</td>
<td>♗</td>
<td>♕</td>
<td>♔</td>
<td></td>
<td></td>
<td>♖</td>
</tr>
</tbody>
</table>

## Credits

* [MultiMarkdown][mmd6], Lightweight
  markup processor to produce HTML, LaTeX, and more.
* [markdown-it][mdit], Markdown parser, done right.
  100% CommonMark support, extensions, syntax plugins &amp; high speed.

## License

This software is licensed under the [MIT license][license] &copy; RedBug312.

[license]: https://opensource.org/licenses/mit-license.php
