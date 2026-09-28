export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function downloadCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  filePrefix: string
): void {
  const csv = [
    columns.map((column) => csvCell(column.header)).join(','),
    ...rows.map((row) =>
      columns.map((column) => csvCell(column.value(row))).join(',')
    ),
  ].join('\r\n');
  // Prefix with a BOM so Excel opens UTF-8 Vietnamese text correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
