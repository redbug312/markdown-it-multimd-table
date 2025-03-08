import table from './lib/table.mjs'

export default function multimd_table_plugin (md, options) {
  const defaults = {
    multiline: false,
    rowspan: false,
    headerless: false,
    multibody: true,
    autolabel: true
  }
  const opts = md.utils.assign({}, defaults, options || {})
  md.block.ruler.at('table', table.bind(null, opts), { alt: ['paragraph', 'reference'] })
}
