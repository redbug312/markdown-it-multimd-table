# MultiMarkdown Tables: Requirements
From [MultiMarkdown](http://fletcher.github.io/MultiMarkdown-4/tables)

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
> NOTE: Assumed legal pipe chars, could be leading or tailing

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
............  | :==========:+ | -----------: |
Content       |   **Cell**    |         Cell |
New section   |     More      |         Data |
```
```html
<table>
<thead>
<tr>
<th>First Header</th>
<th style="text-align:center" class=".export_wrap">Second Header</th>
<th style="text-align:right">Third Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content</td>
<td style="text-align:center" class=".export_wrap"><strong>Cell</strong></td>
<td style="text-align:right">Cell</td>
</tr>
<tr>
<td>New section</td>
<td style="text-align:center" class=".export_wrap">More</td>
<td style="text-align:right">Data</td>
</tr>
</tbody>
</table>
```

## Cell content must be on one line only
## Columns are separated by |
## The first line of the table, and the alignment/divider line, must start at the beginning of the line
