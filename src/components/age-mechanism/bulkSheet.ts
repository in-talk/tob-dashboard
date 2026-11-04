// Excel / CSV reading for BulkAddDialog — kept free of React so it can be
// exercised directly with real files.

/** One column of the bulk format — same order for pasted lines and Excel. */
export type BulkColumn = {
  /** Header name in Excel, e.g. "keyword" or "match_type". */
  name: string;
  required?: boolean;
  /** Allowed values / default, shown in the Excel help table. */
  hint?: string;
};

export type SheetRow = { row: number; cells: string[] };

/** "Match Type", "match-type", "match_type" → "matchtype". */
const normalizeHeader = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");

/**
 * Read the first sheet of an .xlsx / .xls / .csv file into rows of cells in
 * `columns` order. A first row whose cells name the columns is treated as the
 * header (columns may then be in any order); otherwise columns are positional.
 */
export async function readSheet(
  file: Pick<Blob, "arrayBuffer">,
  columns: BulkColumn[],
): Promise<SheetRow[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  // Keep blank rows so row numbers match what Excel shows; the sheet's used
  // range may also start below row 1.
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });
  const firstRow = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).s.r : 0;
  const rows = raw.map((r, i) => ({
    row: firstRow + i + 1, // 1-based, as Excel shows it
    cells: r.map((c) => String(c ?? "").trim()),
  }));
  const nonEmpty = rows.filter((r) => r.cells.some((c) => c.length > 0));

  const wanted = columns.map((c) => normalizeHeader(c.name));
  const first = (nonEmpty[0]?.cells ?? []).map(normalizeHeader);
  const hasHeader = first.includes(wanted[0]);
  const indexes = hasHeader
    ? wanted.map((w) => first.indexOf(w))
    : wanted.map((_, i) => i);

  return nonEmpty.slice(hasHeader ? 1 : 0).map(({ row, cells }) => ({
    row,
    cells: indexes.map((idx) => (idx >= 0 ? cells[idx] ?? "" : "")),
  }));
}
