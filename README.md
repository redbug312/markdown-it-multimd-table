[![NPM version](https://img.shields.io/npm/v/markdown-it-multimd-table.svg?style=flat)](https://www.npmjs.org/package/markdown-it-multimd-table)
[![Build Status](https://travis-ci.org/RedBug312/markdown-it-multimd-table.svg?branch=master)](https://travis-ci.org/RedBug312/markdown-it-multimd-table)
[![Coverage Status](https://coveralls.io/repos/github/RedBug312/markdown-it-multimd-table/badge.svg?branch=master)](https://coveralls.io/github/RedBug312/markdown-it-multimd-table?branch=master)

MultiMarkdown table syntax plugin for markdown-it markdown parser

## Intro
When writing table in Markdown syntax, we have to fallback to write raw HTML tags, if we just need some advanced attribute like `colspan`.
[MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/) is an extended Markdown spec covering fancy features.
It has defined some complete and clear rules for advanced Markdown table syntax, and aims to be compatible to basic table syntax as possible.

[markdown-it](https://markdown-it.github.io/) is a powerful and widely-used Markdown compiler, in native it supports basic table syntax only.
It allows plugins to expand it capability, and this plugin replaced the original table parser in markdown-it to support MultiMarkdown table syntax.

For now, these extended features are provided:
- Cells spanning multiple columns
- Cells spanning multiple rows (optional)
- Grouped table header rows or data rows
- Table caption above or below the table
- Blocked elements (lists, codes, paragraphs...) in table (optional)
- Table header not required (optional)

Noted: the plugin is not a re-written of MultiMarkdown to deploy on markdown-it, it will generate HTML different from MultiMarkdown official compiler in some corner cases.
This plugin try to follow the rule defined in [MultiMarkdown User's Guide](http://fletcher.github.io/MultiMarkdown-5/tables) as possible.
If some case is reasonable but behaves strangely, please pose an issue for that.

## Usage
```javascript
// defaults
var md = require('markdown-it')()
            .use(require('markdown-it-multimd-table'));

// full options list (same to defaults)
var md = require('markdown-it')()
            .use(require('markdown-it-multimd-table'), {
              multiline:  false,
              rowspan:    false,
              headerless: false,
            });

md.render(/*...*/)
```

To simply test this plugin, you can do these in terminal:
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

And you will see the rendered table in the browser:

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

Noted that GitHub filters out `style` property, so the example displays with
the obsolete `align` property. But in actual this plugin outputs `style`
property with `text-align` CSS attribute.

### Multiline (optional)

A backslash at end to join cell contents with the following lines.<br>
This feature is contributed by [Lucas-C](https://github.com/Lucas-C).

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

If this option is enabled, code above would be parsed as:

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

`^^` in a cell indicates it should be merged with the cell above.<br>
This feature is contributed by [pmccloghrylaing](https://github.com/pmccloghrylaing).

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

If this option is enabled, code above would be parsed as:

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

If this option is enabled, code above would be parsed as:

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

* [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/), Lightweight markup processor to produce HTML, LaTeX, and more.
* [markdown-it](https://markdown-it.github.io/), Markdown parser, done right. 100% CommonMark support, extensions, syntax plugins & high speed.

## License
This software is licensed under the [MIT license](https://opensource.org/licenses/mit-license.php) © RedBug312.
