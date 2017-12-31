[![NPM version](https://img.shields.io/npm/v/markdown-it-multimd-table.svg?style=flat)](https://www.npmjs.org/package/markdown-it-multimd-table)
[![Build Status](https://travis-ci.org/RedBug312/markdown-it-multimd-table.svg?branch=master)](https://travis-ci.org/RedBug312/markdown-it-multimd-table)
[![Coverage Status](https://coveralls.io/repos/github/RedBug312/markdown-it-multimd-table/badge.svg?branch=master)](https://coveralls.io/github/RedBug312/markdown-it-multimd-table?branch=master)

Multimarkdown table syntax plugin for markdown-it markdown parser 

## Intro
Bored with HTML table tags when I need some extended table functions like `colspan` in Markdown. I found that [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/) had defined complete and clear rules for advanced table syntax, which is compatible to standard Markdown table syntax at the same time.

For example, the following features are given:
* `colspan` attribute
* Multiple `<thead>` and `<tbody>`
* Captions

So I altered the table parser in markdown-it for the Multimarkdown syntax.

NOTE: This plugin might behave differently from MultiMarkdown for some edging cases; For this plugin was developed mainly under the rules in [MultiMarkdown User's Guide](http://fletcher.github.io/MultiMarkdown-5/tables). Please impose an issue if you find problems related.

## Usage
```javascript
var md = require('markdown-it')()
            .use(require('markdown-it-multimd-table'));

md.render(/*...*/)
```

For test, do this in terminal:
```bash
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
"And more      | With an escaped '\|'         ||\n" +
"[Prototype table]                              \n";
console.log(md.render(exampleTable));

$ node test.js > test.html
$ firefox test.html
```

You might see the table in browser:

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

### Multiple lines of row

Allow table rows parsed as multiple lines with end-of-the-line backslashes, the feature is contributed by [Lucas-C](https://github.com/Lucas-C).

```markdown
First header | Second header
-------------|---------------
List:        | More  \
- over       | data  \
- several    |       \
- lines      |
```

would be parsed as

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

To enable this feature, you have to set the option:

```javascript
var md = require('markdown-it')()
              .use(require('markdown-it-multimd-table'), {enableMultilineRows: true});
```

## Credits
* [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/), Lightweight markup processor to produce HTML, LaTeX, and more.
* [markdown-it](https://markdown-it.github.io/), Markdown parser, done right. 100% CommonMark support, extensions, syntax plugins & high speed

## License
This software is licensed under the [MIT license](https://opensource.org/licenses/mit-license.php) © RedBug312.
