import { Node, Edge, StateMachine } from './fsm.mjs'
import { Metadata, Caption, Delimiter, TableRow } from './meta.mjs'

function scan_bound_indices (state, line) {
  /**
   * Naming convention of positional variables
   * - list-item
   * ·········longtext······\n
   *   ^head  ^start  ^end  ^max
   */
  const start = state.bMarks[line] + state.sCount[line]
  const head = state.bMarks[line] + state.blkIndent
  const end = state.skipSpacesBack(state.eMarks[line], head)
  const bounds = []; let pos; let posjump
  let escaped = false; let code = false; let serial = 0

  /* Scan for valid pipe character position */
  for (pos = start; pos < end; pos++) {
    switch (state.src.charCodeAt(pos)) {
      case 0x5c /* \ */:
        escaped = true; break
      case 0x60 /* ` */:
        posjump = state.skipChars(pos, 0x60) - 1
        /* make \` closes the code sequence, but not open it;
           the reason is that `\` is correct code block */
        /* eslint-disable-next-line brace-style */
        if (posjump > pos) {
          if (!code) {
            if (serial === 0) { serial = posjump - pos } else if (serial === posjump - pos) { serial = 0 }
          }
          pos = posjump
        } else if (code || (!escaped && !serial)) { code = !code }
        escaped = false; break
      case 0x7c /* | */:
        if (!code && !escaped) { bounds.push(pos) }
        escaped = false; break
      default:
        escaped = false; break
    }
  }
  if (bounds.length === 0) {
    return bounds
  }

  /* Pad in newline characters on last and this line */
  if (bounds[0] > head) { bounds.unshift(head - 1) }
  if (bounds[bounds.length - 1] < end - 1) { bounds.push(end) }

  return bounds
}

function table_row (state, silent, options, line) {
  const meta = { bounds: null, multiline: null }
  const bounds = scan_bound_indices(state, line)
  let start; let pos; let oldMax

  if (bounds.length < 2) { return false }
  if (silent) { return true }

  meta.bounds = bounds

  /* Multiline. Scan boundaries again since it's very complicated */
  if (options.multiline) {
    start = state.bMarks[line] + state.sCount[line]
    pos = state.eMarks[line] - 1 /* where backslash should be */
    meta.multiline = (state.src.charCodeAt(pos) === 0x5C/* \ */)
    if (meta.multiline) {
      oldMax = state.eMarks[line]
      state.eMarks[line] = state.skipSpacesBack(pos, start)
      meta.bounds = scan_bound_indices(state, line)
      state.eMarks[line] = oldMax
    }
  }

  return meta
}

function table_empty (state, _silent, line) {
  return state.isEmpty(line)
}

function table (options, state, startLine, endLine, silent) {
  if (startLine + 2 > endLine) {
    return false
  }
  console.log(`being asked for lines ${startLine}..${endLine}`)

  const metadata = new Metadata()
  let token, cap, del, th, td
  let foundTableRow = false

  const highestEdge = Edge(0b10000)
  let initialNode = Node(0b10100)
  const acceptNodes = [Node(0b10010), Node(0b10011), Node(0b00000)]
  const transitions = [
    [Node(0b10100), Edge(0b10000), Node(0b00100)],
    [Node(0b10100), Edge(0b00100), Node(0b01100)],
    [Node(0b00100), Edge(0b00100), Node(0b01100)],
    [Node(0b01100), Edge(0b01000), Node(0b10010)],
    [Node(0b01100), Edge(0b00100), Node(0b01100)],
    [Node(0b10010), Edge(0b10000), Node(0b00000)],
    [Node(0b10010), Edge(0b00010), Node(0b10011)], // index 6
    [Node(0b10011), Edge(0b10000), Node(0b00000)],
    [Node(0b10011), Edge(0b00010), Node(0b10011)],
    [Node(0b10011), Edge(0b00001), Node(0b10010)]
  ]
  if (options.headerless) {
    initialNode = Node(0b11100)
    transitions.push([Node(0b11100), Edge(0b10000), Node(0b01100)])
    transitions.push([Node(0b11100), Edge(0b01000), Node(0b10010)])
    transitions.push([Node(0b11100), Edge(0b00100), Node(0b01100)])
  }
  if (!options.multibody) {
    transitions[6] = [Node(0b10010), Edge(0b00010), Node(0b10010)]
  }

  const machine = new StateMachine(highestEdge, initialNode, acceptNodes, transitions)

  for (let line = startLine; line < endLine; line++) {
    const matches = edge => {
      switch (edge) {
        case Edge(0b10000):
          return parseCaption(state, line, true, true)
        case Edge(0b01000):
          return parseDelimiter(state, line, true, options)
        case Edge(0b00100):
          return table_row(state, true, options, line)
        case Edge(0b00010):
          return table_row(state, true, options, line)
        case Edge(0b00001):
          return table_empty(state, true, line)
      }
    }
    const edge = machine.next(matches)
    if (!edge) {
      break
    }
    switch (edge) {
      case Edge(0b10000):
        if (metadata.caption) {
          break
        }
        metadata.clearHasTableRowBelow()
        cap = parseCaption(state, line, false, line === startLine)
        metadata.caption = cap
        metadata.lastLine = line
        foundTableRow = false
        break
      case Edge(0b01000):
        metadata.clearHasTableRowBelow()
        del = parseDelimiter(state, line, false, options)
        metadata.delimiter = del
        metadata.lastLine = line
        foundTableRow = false
        break
      case Edge(0b00100):
        th = parseTableRow(state, line, false, true, options)
        th.hasTableRowAbove = foundTableRow
        metadata.rows.push(th)
        metadata.lastLine = line
        foundTableRow = true
        break
      case Edge(0b00010):
        td = parseTableRow(state, line, false, false, options)
        td.hasTableRowAbove = foundTableRow
        metadata.rows.push(td)
        metadata.lastLine = line
        foundTableRow = true
        break
      case Edge(0b00001):
        metadata.clearHasTableRowBelow()
        foundTableRow = false
        break
    }
  }

  const accepted = machine.accepted()
  metadata.clearHasTableRowBelow()

  if (!accepted) {
    return false
  } else if (silent) {
    console.log(`accepted ${startLine}..${endLine}, remained silent`)
    return true
  }

  if (options.rowspan) {
    const hasDoubleCaretsBelow = []
    const countDoubleCarets = []

    for (let rth = metadata.rows.length - 1; rth >= 0; rth--) {
      const row = metadata.rows[rth]

      for (let nth = 0; nth < row.cells.length; nth++) {
        hasDoubleCaretsBelow[nth] = hasDoubleCaretsBelow[nth] || false
        countDoubleCarets[nth] = countDoubleCarets[nth] || 0

        const [start, end] = row.cells[nth]
        const content = state.src.slice(start, end).trim()
        const isDoubleCarets = content === '^^' && row.hasTableRowAbove

        if (!row.isContinuing && hasDoubleCaretsBelow[nth]) {
          countDoubleCarets[nth]++
        } else if (!row.isContinuing) {
          countDoubleCarets[nth] = 0
        }
        row.rowspans[nth] = isDoubleCarets ? 0 : countDoubleCarets[nth] + 1
        hasDoubleCaretsBelow[nth] = isDoubleCarets
      }
    }
  }

  console.log(`metadata for ${startLine}..${endLine} is ${JSON.stringify(metadata)}`)
  token = state.push('table_open', 'table', 1)
  token.map = [startLine, metadata.lastLine + 1]

  if (metadata.caption) {
    const caption = metadata.caption
    const side = caption.atTableStart ? 'top' : 'bottom'
    const slugify = s => s.toLowerCase().replace(/\W+/g, '')

    token = state.push('caption_open', 'caption', 1)
    token.attrs = []
    token.map = [caption.line, caption.line + 1]

    if (caption.label) {
      const [start, end] = caption.label
      const value = state.src.slice(start, end)
      token.attrs.push(['id', `${value}`])
    } else if (options.autolabel) {
      const [start, end] = caption.text
      const value = slugify(state.src.slice(start, end))
      token.attrs.push(['id', `${value}`])
    }
    if (side !== 'top') {
      token.attrs.push(['style', `caption-side: ${side}`])
    }

    const [start, end] = caption.text
    const content = state.src.slice(start, end)

    token = state.push('inline', '', 0)
    token.content = content
    token.map = [caption.line, caption.line + 1]
    token.children = []

    token = state.push('caption_close', 'caption', -1)
  }

  let accumulated = []
  for (const row of metadata.rows) {
    const partTag = row.isHeader ? 'thead' : 'tbody'
    const cellTag = row.isHeader ? 'th' : 'td'
    const isContinuing = row.isContinuing && row.hasTableRowBelow
    const hasTableRowBelow = row.hasTableRowBelow
    const hasTableRowAbove = row.hasTableRowAbove
    accumulated.push(row)

    if (!hasTableRowAbove) {
      token = state.push(`${partTag}_open`, partTag, 1)
    }
    if (isContinuing) {
      continue
    }

    // Emit each table cells, including <th> or <td>
    console.log(`accumulated rows are ${JSON.stringify(accumulated)}`)
    console.assert(accumulated.length > 0)
    const frontRow = accumulated.at(0)
    const rearRow = accumulated.at(-1)
    console.assert(rearRow === row)

    token = state.push('tr_open', 'tr', 1)
    token.map = [frontRow.line, rearRow.line + 1]

    for (let nth = 0, advance = 0; nth < frontRow.cells.length; nth += 1) {
      const isBlockLevel = options.multiline && accumulated.length > 1
      const align = metadata.delimiter.aligns[nth + advance]
      const wrap = metadata.delimiter.wraps[nth + advance]
      const colspan = frontRow.colspans[nth]
      const rowspan = options.rowspan ? frontRow.rowspans[nth] : 1
      if (!rowspan) {
        continue
      }
      const content = accumulated
        .filter(r => nth < r.cells.length)
        .map(r => state.src.slice(r.cells[nth][0], r.cells[nth][1]))
        .map(t => t.trimRight())
        .join('\n')
      console.log(`content is "${content}"`)
      console.assert(colspan !== null)
      console.assert(content !== null)

      token = state.push(`${cellTag}_open`, cellTag, 1)
      token.attrs = []
      token.map = [frontRow.line, rearRow.line + 1]

      if (align) {
        token.attrs.push(['style', `text-align:${align}`])
      }
      if (wrap) {
        token.attrs.push(['class', 'extend'])
      }
      if (colspan > 1) {
        advance += colspan - 1
        token.attrs.push(['colspan', `${colspan}`])
      }
      if (rowspan > 1) {
        token.attrs.push(['rowspan', `${rowspan}`])
      }

      if (isBlockLevel) {
        state.md.block.parse(content, state.md, state.end, state.tokens)
      } else {
        token = state.push('inline', '', 0)
        token.content = content.trim()
        token.map = [frontRow.line, rearRow.line + 1]
        token.children = []
      }

      token = state.push(`${cellTag}_close`, cellTag, -1)
    }

    token = state.push('tr_close', 'tr', -1)

    if (!hasTableRowBelow) {
      token = state.push(`${partTag}_close`, partTag, -1)
    }
    accumulated = []
  }

  token = state.push('table_close', 'table', -1)
  state.line = metadata.lastLine + 1
  console.log(`accepted ${startLine}..${endLine}, going to line ${metadata.lastLine + 1}`)

  return true
}

/**
 * @param {StateBlock} state
 * @param {number} line
 * @param {boolean} silent
 * @param {boolean} atTableStart
 */
function parseCaption (state, line, silent, atTableStart) {
  const head = state.bMarks[line] + state.blkIndent
  const tail = state.eMarks[line]
  const end = state.skipSpacesBack(tail, head)
  const startsWithBracket = state.src.at(head) === '['
  const endsWithBracket = state.src.at(end - 1) === ']'

  if (!startsWithBracket || !endsWithBracket) {
    return false
  } else if (silent) {
    return true
  }

  const middle = head + state.src.slice(head, end).lastIndexOf('][')
  const label = state.src.slice(middle + 2, end - 1)
  const isLabelValid = head <= middle && !label.includes(']') && !label.includes('[')

  if (isLabelValid) {
    const text = [head + 1, middle]
    const label = [middle + 2, end - 1]
    const meta = new Caption(line, text, label, atTableStart)
    return meta
  } else {
    const text = [head + 1, end - 1]
    const label = null
    const meta = new Caption(line, text, label, atTableStart)
    return meta
  }
}

/**
 * @param {StateBlock} state
 * @param {number} line
 * @param {boolean} silent
 * @param {Options} opts
 */
function parseDelimiter (state, line, silent, opts) {
  const head = state.bMarks[line] + state.blkIndent
  const tail = state.eMarks[line]
  const end = state.skipSpacesBack(tail, head)
  const meta = new Delimiter()

  const cells = scanLineCells(state, head, end)
  if (cells.length === 0) {
    return false
  } else if (state.sCount[line] - state.blkIndent >= 4) {
    return false
  }

  for (const cell of cells) {
    const [cHead, cTail] = cell
    if (cHead === cTail) {
      return false
    }

    let cStart = state.skipSpaces(cHead, cTail)
    const startsWithColon = state.src.at(cStart) === ':'
    cStart += Number(startsWithColon)

    let cEnd = state.skipSpacesBack(cTail, cHead)
    const endsWithPlus = state.src.at(cEnd - 1) === '+'
    cEnd -= Number(endsWithPlus)
    const endsWithColon = state.src.at(cEnd - 1) === ':'
    cEnd -= Number(endsWithColon)

    const allMinus = state.skipChars(cStart, '-'.charCodeAt(0)) === cEnd
    const allEquals = state.skipChars(cStart, '='.charCodeAt(0)) === cEnd

    if (!allMinus && !allEquals) {
      return false
    } else if (cStart >= cEnd) {
      return false
    }

    let alignment
    if (!startsWithColon && !endsWithColon) {
      alignment = null
    } else if (!startsWithColon && endsWithColon) {
      alignment = 'right'
    } else if (startsWithColon && !endsWithColon) {
      alignment = 'left'
    } else {
      alignment = 'center'
    }
    meta.aligns.push(alignment)
    meta.wraps.push(endsWithPlus)
  }

  if (silent) {
    return true
  }
  return meta
}

/**
 * @param {StateBlock} state
 * @param {number} line
 * @param {boolean} silent
 * @param {boolean} isHeader
 * @param {Options} opts
 */
function parseTableRow (state, line, silent, isHeader, opts) {
  const head = state.bMarks[line] + state.blkIndent
  const tail = state.eMarks[line]
  const endsWithBackslash = state.src.at(tail - 1) === '\\'
  const isContinuing = opts.multiline && endsWithBackslash
  const end = state.skipSpacesBack(tail, head) - Number(isContinuing)

  // TODO panic when the line contains only one backslash?
  const cells = scanLineCells(state, head, end)
  if (cells.length === 0) {
    return false
  } else if (silent) {
    return true
  }

  const colspanCells = []
  const colspans = []
  let countEmpty = 0
  for (let nth = cells.length - 1; nth >= 0; nth--) {
    const isEmpty = cells[nth][0] === cells[nth][1]
    if (isEmpty) {
      countEmpty++
    } else {
      colspanCells.push(cells[nth])
      colspans.push(countEmpty + 1)
      countEmpty = 0
    }
  }
  colspanCells.reverse()
  colspans.reverse()

  const meta = new TableRow(line, colspanCells, colspans, isContinuing, isHeader)
  return meta
}

/**
 * @param {StateBlock} state
 * @param {number} head
 * @param {number} start
 * @param {number} end
 * @returns {number[][]}
 */
function scanLineCells (state, head, end) {
  console.log(`scan line at ${head}..${end} has "${state.src.slice(head, end)}"`)
  const bounds = []
  let escaped = false
  let pos = head
  while (pos < end) {
    switch (state.src.at(pos)) {
      case '\\':
        pos++
        escaped ^= true
        break
      case '|':
        if (!escaped) {
          bounds.push(pos, pos + 1)
        }
        pos++
        escaped = false
        break
      default:
        pos++
        escaped = false
        break
    }
  }
  if (bounds.length === 0) {
    return []
  }

  const startsWithVerticalLine = bounds.at(0) === head
  const endsWithVerticalLine = bounds.at(-1) === end
  if (startsWithVerticalLine) {
    bounds.shift()
  } else {
    bounds.unshift(head)
  }
  if (endsWithVerticalLine) {
    bounds.pop()
  } else {
    bounds.push(end)
  }
  console.assert(bounds.length % 2 === 0)

  const cells = []
  for (let i = 0; i < bounds.length; i += 2) {
    const start = bounds.at(i)
    const end = bounds.at(i + 1)
    console.log(`cell ${i / 2} at ${start}..${end} has "${state.src.slice(start, end)}"`)
    cells.push([start, end])
  }
  return cells
}

export default table
