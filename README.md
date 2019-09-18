[![NPM version](https://img.shields.io/npm/v/markdown-it-multimd-table.svg?style=flat)](https://www.npmjs.org/package/markdown-it-multimd-table)
[![Build Status](https://travis-ci.org/RedBug312/markdown-it-multimd-table.svg?branch=master)](https://travis-ci.org/RedBug312/markdown-it-multimd-table)
[![Coverage Status](https://coveralls.io/repos/github/RedBug312/markdown-it-multimd-table/badge.svg?branch=master)](https://coveralls.io/github/RedBug312/markdown-it-multimd-table?branch=master)

MultiMarkdown table syntax plugin for markdown-it markdown parser

## Intro
In general Markdown syntax, we have to write raw HTML tags when `colspan` attribute is needed. Luckily, I found that [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/) had defined complete and clear rules for advanced Markdown table syntax, and compatible to general Markdown table syntax.

So I extend the table parser in markdown-it to support MultiMarkdown table syntax. For now, the following features are provided:
- Cells spanning multiple columns
- Cells spanning multiple rows (optional)
- Grouped table headers
- Grouped table rows
- Table captions
- Lists in table cell (optional)
- Line breaks in table cells (optional)
- Not-required header (optional)

Noted that the plugin might behave differently from MultiMarkdown in some edge cases; since the plugin aims just to follow the rules in [MultiMarkdown User's Guide](http://fletcher.github.io/MultiMarkdown-5/tables).

## Usage
```javascript
// default mode
var md = require('markdown-it')()
            .use(require('markdown-it-multimd-table'));

// full options list (defaults)
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
<th style="text-align:center" colspan="2">Grouping</th>
</tr>
<tr>
<th>First Header</th>
<th style="text-align:center">Second Header</th>
<th style="text-align:right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content</td>
<td style="text-align:center" colspan="2"><em>Long Cell</em></td>
</tr>
<tr>
<td>Content</td>
<td style="text-align:center"><strong>Cell</strong></td>
<td style="text-align:right">Cell</td>
</tr>
</tbody>
<tbody>
<tr>
<td>New section</td>
<td style="text-align:center">More</td>
<td style="text-align:right">Data</td>
</tr>
<tr>
<td>And more</td>
<td style="text-align:center" colspan="2">With an escaped '|'</td>
</tr>
</tbody>
<caption id="prototypetable">Prototype table</caption>
</table>

### Multi-line (optional)

A backslash at end to join cell contents with the following lines.
This feature is contributed by [Lucas-C](https://github.com/Lucas-C).

```markdown
First header | Second header
-------------|---------------
List:        | More  \
- over       | data  \
- several    |       \
- lines      |
```

Would be parsed as

<table>
<thead>
<tr>
<th>First header</th>
<th>Second header</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<p>List:</p>
<ul>
<li>over</li>
<li>several</li>
<li>lines</li>
</ul>
</td>
<td>
<p>More
data</p>
</td>
</tr>
</tbody>
</table>

### Rowspan (optional)

`^^` in a cell indicates it should be merged with the cell above.
This feature is contributed by [pmccloghrylaing](https://github.com/pmccloghrylaing).

```markdown
First header | Second header
-------------|---------------
Merged       | Cell 1
^^           | Cell 2
^^           | Cell 3
```

Would be parsed as

<table>
<thead>
<tr>
<th>First header</th>
<th>Second header</th>
</tr>
</thead>
<tbody>
<tr>
<td rowspan="3">Merged</td>
<td>Cell 1</td>
</tr>
<tr>
<td>Cell 2</td>
</tr>
<tr>
<td>Cell 3</td>
</tr>
</tbody>
</table>

### Headerless (optional)
Table header can be eliminated.

```markdown
|----------|-----|
|Headerless|table|
```

Would be parsed as

<table>
<tbody>
<tr>
<td>Headerless</td>
<td>table</td>
</tr>
</tbody>
</table>

## Credits
* [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/), Lightweight markup processor to produce HTML, LaTeX, and more.
* [markdown-it](https://markdown-it.github.io/), Markdown parser, done right. 100% CommonMark support, extensions, syntax plugins & high speed.

## License
This software is licensed under the [MIT license](https://opensource.org/licenses/mit-license.php) © RedBug312.
