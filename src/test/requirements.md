# MultiMarkdown Tables: Other Notes
From [MultiMarkdown 5](http://fletcher.github.io/MultiMarkdown-5)

## Standards

```markdown
First Header  | Second Header | Third Header |
------------  | :-----------: | -----------: |
Content       |   **Cell**    |         Cell |
New section   |     More      |         Data |
```
```html
<table>
<thead>
<tr>
<th>First Header</th>
<th style="text-align:center">Second Header</th>
<th style="text-align:right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content</td>
<td style="text-align:center"><strong>Cell</strong></td>
<td style="text-align:right">Cell</td>
</tr>
<tr>
<td>New section</td>
<td style="text-align:center">More</td>
<td style="text-align:right">Data</td>
</tr>
</tbody>
</table>
```

## There must be at least one | per line
> NOTE: Assumed legal pipe chars, could be leading, tailing or both

(Against at line 4)
```markdown
First Header  | Second Header | Third Header |
------------  | :-----------: | -----------: |
Content      \|   **Cell**   \|         Cell |
New section  \|     More     `|`        Data\|
```
```html
<table>
<thead>
<tr>
<th>First Header</th>
<th style="text-align:center">Second Header</th>
<th style="text-align:right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content      |   <strong>Cell</strong>   |         Cell</td>
<td style="text-align:center"></td>
<td style="text-align:right"></td>
</tr>
</tbody>
</table>
<p>New section  |     More     <code>|</code>        Data|</p>
```

(Against at line 1)
```markdown
First Header \| Second Header`|`Third Header\|
------------  | :-----------: | -----------: |
Content       |   **Cell**    |         Cell |
New section   |      More     |        Data  |
```
```html
<p>First Header | Second Header<code>|</code>Third Header|
------------  | :-----------: | -----------: |
Content       |   <strong>Cell</strong>    |         Cell |
New section   |      More     |        Data  |</p>
```

## The “separator” line between headers and table content must contain only |,-, =, :,., +, or spaces
> NOTE: no implementation detailed about denoting wrappable, use class `export_wrap` here

```markdown
First Header  | Second Header | Third Header |
============  | :==========:+ | -----------: |
Content       |   **Cell**    |         Cell |
New section   |     More      |         Data |
```
```html
<table>
<thead>
<tr>
<th>First Header</th>
<th style="text-align:center" class=".wrappable">Second Header</th>
<th style="text-align:right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content</td>
<td style="text-align:center" class=".wrappable"><strong>Cell</strong></td>
<td style="text-align:right">Cell</td>
</tr>
<tr>
<td>New section</td>
<td style="text-align:center" class=".wrappable">More</td>
<td style="text-align:right">Data</td>
</tr>
</tbody>
</table>
```

## Cell content must be on one line only

```markdown
First Header  | Second Header | Third Header |
------------  | :-----------: | -----------: |
Content       |   **Cell**    |         Cell |
New section   |     1. More
                    2. MORE!  |         Data |
```
```html
<table>
<thead>
<tr>
<th>First Header</th>
<th style="text-align:center">Second Header</th>
<th style="text-align:right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content</td>
<td style="text-align:center"><strong>Cell</strong></td>
<td style="text-align:right">Cell</td>
</tr>
<tr>
<td>New section</td>
<td style="text-align:center">1. More</td>
<td style="text-align:right"></td>
</tr>
</tbody>
</table>
<pre><code>                2. MORE!  |         Data |
</code></pre>
```

## Columns are separated by |
> NOTE: Defined in PHP Markdown Extra. Test cases ignored.

## The first line of the table, and the alignment/divider line, must start at the beginning of the line
> NOTE: The example in MultiMarkdown breaks this requirement. I altered this rule as follows:
> The headers of the table, and the alignment/divider line, must start at the beginning of the line
>     ^^^^^^^

```markdown
|             |   Grouping    |              |
|             |               |  Grouping 2  |
First Header  | Second Header | Third Header |
------------  | :-----------: | -----------: |
Content       |   **Cell**    |         Cell |
New section   |     More      |         Data |
```
```html
<table>
<thead>
<tr>
<th></th>
<th style="text-align:center">Grouping</th>
<th style="text-align:right"></th>
</tr>
<tr>
<th></th>
<th style="text-align:center"></th>
<th style="text-align:right">Grouping 2</th>
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
<td style="text-align:center"><strong>Cell</strong></td>
<td style="text-align:right">Cell</td>
</tr>
<tr>
<td>New section</td>
<td style="text-align:center">More</td>
<td style="text-align:right">Data</td>
</tr>
</tbody>
</table>
```

```markdown
|             |   Grouping    |              |
------------  |               |  Grouping 2  |
------------  | Second Header | Third Header |
------------  | :-----------: | -----------: |
Content       |   **Cell**    |         Cell |
New section   |     More      |         Data |
```
```html
<table>
<thead>
<tr>
<th></th>
<th style="text-align:center">Grouping</th>
<th style="text-align:right"></th>
</tr>
<tr>
<th>------------</th>
<th style="text-align:center"></th>
<th style="text-align:right">Grouping 2</th>
</tr>
<tr>
<th>------------</th>
<th style="text-align:center">Second Header</th>
<th style="text-align:right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content</td>
<td style="text-align:center"><strong>Cell</strong></td>
<td style="text-align:right">Cell</td>
</tr>
<tr>
<td>New section</td>
<td style="text-align:center">More</td>
<td style="text-align:right">Data</td>
</tr>
</tbody>
</table>
```

```markdown
|             |   Grouping    |              |
------------  | ------------- | -----------r |
Content       |   **Cell**    |         Cell |
New section   |     More      |         Data |
```
```html
<p>|             |   Grouping    |              |
------------  | ------------- | -----------r |
Content       |   <strong>Cell</strong>    |         Cell |
New section   |     More      |         Data |</p>
```
