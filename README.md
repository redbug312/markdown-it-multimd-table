## Intro
Bored with HTML table tags when I need some extended table functions like `colspan` in Markdown. I found that [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/) had defined complete and clear rules for advanced table syntax, which is compatible to standard Markdown table syntax at the same time.

For example, the following features are given:
* `colspan` attribute
* Multiple `<thead>` and `<tbody>`
* Captions

So as to create MultiMarkdown exmaple table in the following:

<table>
<caption id="prototypetable">Prototype table</caption>
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
</table>

NOTE: This plugin might behaves different from MultiMarkdown on some edge cases. This plugin was developed under rules in [MultiMarkdown User's Guide](http://fletcher.github.io/MultiMarkdown-5/tables). Please impose an issue if you find problems related.

## Usage
```
var md = require('markdown-it')()
            .use(require('markdown-it-multimd-table'));

md.render(/*...*/)
```

For test, do this in terminal:
```
$ git clone https://github.com/RedBug312/markdown-it-multimd-table.git
$ npm install markdown-it --save
$ vim test.js

var md = require('markdown-it')()
            .use(require('./markdown-it-multimd-table'));
const exampleTable =
"|             |          Grouping           || \n" +
"First Header  | Second Header | Third Header | \n" +
" ------------ | :-----------: | -----------: | \n" +
"Content       |          *Long Cell*        || \n" +
"Content       |   **Cell**    |         Cell | \n" +
"                                               \n" +
"New section   |     More      |         Data | \n" +
"And more      | With an escaped '\\|'        ||\n" +
"[Prototype table]                              \n";
console.log(md.render(exampleTable));

$ node test.js > test.html
$ firefox test.html
```

## Credits
* [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/), Lightweight markup processor to produce HTML, LaTeX, and more.
* [markdown-it](https://markdown-it.github.io/), Markdown parser, done right. 100% CommonMark support, extensions, syntax plugins & high speed

## License
This software is licensed under the [MIT license](https://opensource.org/licenses/mit-license.php) © RedBug312.
