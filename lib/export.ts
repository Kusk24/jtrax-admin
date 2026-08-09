/**
 * CSV export for the list screens.
 *
 * There is no backend to ask for a report, so export is built in the browser
 * from the same rows the table is already showing — filters and all. Excel is
 * the destination in practice, hence the BOM and CRLF line endings.
 */

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  const text = value == null ? "" : String(value);
  /* Quote anything a spreadsheet would otherwise split or mangle. */
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns: string[], rows: CsvCell[][]): string {
  return [columns, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

/** Triggers a download of `rows` as `<filename>-<yyyy-mm-dd>.csv`. */
export function downloadCsv(filename: string, columns: string[], rows: CsvCell[][]): void {
  /* The BOM is what makes Excel read the file as UTF-8 — without it Thai
     column headers arrive as mojibake. */
  const blob = new Blob(["﻿", toCsv(columns, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filename}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
