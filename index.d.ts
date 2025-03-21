import type MarkdownIt from "markdown-it";
interface Options {
  multiline: boolean;
  rowspan: boolean;
  headerless: boolean;
  multibody: boolean;
  autolabel: boolean;
}
declare function multimd_table_plugin(md: MarkdownIt, options?: Partial<Options>): void;
export = multimd_table_plugin;
