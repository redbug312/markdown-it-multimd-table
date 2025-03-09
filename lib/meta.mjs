/**
 * @typedef {object} Metadata
 * @property {Caption | null} caption
 * @property {Delimiter | null} delimiter
 * @property {TableRow[]} rows
 * @property {number} lastLine
 */
export class Metadata {
  constructor () {
    this.caption = null
    this.delimiter = null
    this.rows = []
    this.lastLine = 0
  }

  clearHasTableRowBelow () {
    if (this.rows.length > 0) {
      this.rows.at(-1).hasTableRowBelow = false
    }
  }
}

/**
 * @typedef {object} Caption
 * @property {number} line
 * @property {string} text // TODO use src range
 * @property {number[] | null} label
 * @property {boolean} atTableStart
 */
export class Caption {
  constructor (line) {
    this.line = line
    this.text = null
    this.label = null
    this.atTableStart = false
  }
}

/**
 * @typedef {object} Delimiter
 * @property {string[]} aligns
 * @property {boolean[]} wraps
 */
export class Delimiter {
  constructor () {
    this.aligns = []
    this.wraps = []
  }
}

/**
 * @typedef {object} TableRow
 * @property {number} line
 * @property {number[][]} cells
 * @property {number[]} colspans
 * @property {number[]} rowspans
 * @property {boolean} isContinuing
 * @property {boolean} isHeader
 * @property {boolean} hasTableRowAbove
 * @property {boolean} hasTableRowBelow
 */
export class TableRow {
  constructor (line, cells, colspans, isContinuing, isHeader) {
    this.line = line
    this.cells = cells
    this.colspans = colspans
    this.rowspans = []
    this.isContinuing = isContinuing
    this.isHeader = isHeader
    this.hasTableRowAbove = true
    this.hasTableRowBelow = true
  }
}
