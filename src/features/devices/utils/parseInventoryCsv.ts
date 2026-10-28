import {
  INVENTORY_IMPORT_MAX_ROWS,
  type InventoryImportRow,
} from '../schemas/inventoryImportSchemas';

export class InventoryCsvError extends Error {
  constructor(
    public readonly code: 'header' | 'empty' | 'columns' | 'quote' | 'limit',
    public readonly line: number
  ) {
    super(code);
  }
}

export function parseInventoryCsv(text: string): InventoryImportRow[] {
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const records: { cells: string[]; line: number }[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  let line = 1;
  let startLine = 1;
  const endCell = () => {
    cells.push(cell.trim());
    cell = '';
    closed = false;
  };
  const endRow = () => {
    endCell();
    if (cells.some((value) => value !== ''))
      records.push({ cells, line: startLine });
    cells = [];
    if (records.length > INVENTORY_IMPORT_MAX_ROWS + 1)
      throw new InventoryCsvError('limit', startLine);
  };
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
          closed = true;
        }
      } else {
        cell += char;
        if (char === '\n') line += 1;
      }
    } else if (char === ',') endCell();
    else if (char === '\n') {
      endRow();
      line += 1;
      startLine = line;
    } else if (char === '"' && !cell && !closed) quoted = true;
    else if (char === '"' || (closed && char?.trim()))
      throw new InventoryCsvError('quote', line);
    else if (!closed) cell += char;
  }
  if (quoted) throw new InventoryCsvError('quote', line);
  endRow();
  const header = records.shift();
  if (
    !header ||
    header.cells.length !== 2 ||
    header.cells[0] !== 'serial' ||
    header.cells[1] !== 'model'
  )
    throw new InventoryCsvError('header', header?.line ?? 1);
  if (!records.length) throw new InventoryCsvError('empty', line);
  return records.map((record) => {
    const [serial, model] = record.cells;
    if (record.cells.length !== 2 || !serial || !model)
      throw new InventoryCsvError('columns', record.line);
    return { serial, model };
  });
}
