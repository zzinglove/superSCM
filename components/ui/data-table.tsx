import type { ReactNode } from 'react';

export type DataColumn<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (row: T) => ReactNode };
export default function DataTable<T extends Record<string, unknown>>({ columns, rows, empty = '표시할 데이터가 없습니다.' }: { columns: DataColumn<T>[]; rows: T[]; empty?: string }) {
  if (rows.length === 0) return <p className="empty-state">{empty}</p>;
  return <div className="data-table-scroll"><table className="ui-data-table"><thead><tr>{columns.map((column) => <th key={column.key} style={{ textAlign: column.align ?? 'left' }}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.itemId ?? index)}>{columns.map((column) => <td key={column.key} style={{ textAlign: column.align ?? 'left' }}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
}
