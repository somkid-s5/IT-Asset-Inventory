declare module 'xlsx-populate' {
  interface XlsxRange {
    value(): unknown;
    value(value: unknown): XlsxRange;
    style(style: Record<string, unknown>): XlsxRange;
  }

  interface XlsxRow {
    style(style: Record<string, unknown>): XlsxRow;
  }

  interface XlsxColumn {
    width(value: number): XlsxColumn;
  }

  interface XlsxSheet {
    name(): string;
    name(value: string): XlsxSheet;
    cell(address: string): XlsxRange;
    row(index: number): XlsxRow;
    column(name: string): XlsxColumn;
    usedRange(): XlsxRange;
  }

  interface XlsxWorkbook {
    sheet(indexOrName: number | string): XlsxSheet;
    sheets(): XlsxSheet[];
    addSheet(name: string): XlsxSheet;
    outputAsync(options?: { password?: string }): Promise<Buffer>;
  }

  const XlsxPopulate: {
    fromBlankAsync(): Promise<XlsxWorkbook>;
    fromDataAsync(
      data: Buffer | Uint8Array,
      options?: { password?: string },
    ): Promise<XlsxWorkbook>;
  };

  export default XlsxPopulate;
}
