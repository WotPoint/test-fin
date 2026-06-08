import * as XLSX from 'xlsx';

export interface ParsedAlfaOperation {
  date: string; // YYYY-MM-DD
  externalRef: string;
  categoryName: string;
  description: string;
  comment: string;
  amount: number;
  rawType: 'expense' | 'income' | 'transfer';
  status: string;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).trim();
  // dd.mm.yyyy
  const m = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // ISO or other formats – try native Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val)
    .replace(/\s/g, '') // remove spaces (e.g. "2 500")
    .replace(/,/g, '.'); // decimal comma
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function extractComment(description: string): string {
  // For card operations: take the merchant part after the last "/" before MCC
  // Example: ...RU/Dolgoprudnyj/KRASNOE&BELoe, MCC: 5499
  const lines = description.split(/\r?\n/);
  const full = lines.join(' ');

  // Try to extract merchant after last "/" and before "MCC:" or comma
  const lastSlash = full.lastIndexOf('/');
  if (lastSlash !== -1) {
    const afterSlash = full.slice(lastSlash + 1);
    const mccIdx = afterSlash.toUpperCase().indexOf('MCC:');
    const merchant = mccIdx !== -1 ? afterSlash.slice(0, mccIdx).replace(/,$/, '').trim() : afterSlash.split(',')[0].trim();
    if (merchant && merchant.length > 2) return merchant;
  }

  // For transfers: take first meaningful line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('Операция по карте') && !trimmed.startsWith('2200')) {
      return trimmed;
    }
  }
  return description.slice(0, 100);
}

export function parseAlfaStatement(buffer: Buffer): ParsedAlfaOperation[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON array of arrays (raw rows)
  const data: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Find header row
  let headerRow = -1;
  const expectedHeaders = ['Дата операции', 'Дата', 'Код', 'Категория', 'Описание', 'Сумма', 'Статус'];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as string[];
    if (row.some(cell => typeof cell === 'string' && cell.includes('Дата операции'))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Не найдена строка заголовков "Дата операции" в файле');
  }

  // Build column index map
  const headers = (data[headerRow] as string[]).map(h => String(h || '').trim());
  const colIndex: Record<string, number> = {};
  headers.forEach((h, idx) => {
    if (expectedHeaders.includes(h)) colIndex[h] = idx;
  });

  const operations: ParsedAlfaOperation[] = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;
    if (row.every(cell => cell === '' || cell === null || cell === undefined)) break;

    const dateVal = row[colIndex['Дата операции']];
    const codeVal = row[colIndex['Код']];
    const categoryVal = row[colIndex['Категория']];
    const descVal = row[colIndex['Описание']];
    const sumVal = row[colIndex['Сумма']];
    const statusVal = row[colIndex['Статус']];

    const date = parseDate(dateVal);
    const amount = parseAmount(sumVal);
    const code = String(codeVal || '').trim();

    if (!date || amount === null || !code) {
      console.warn(`[alfa-parser] Пропущена строка ${i + 1}: недостаточно данных`);
      continue;
    }

    const categoryName = String(categoryVal || '').trim();
    const description = String(descVal || '').trim();
    const comment = extractComment(description);
    const status = String(statusVal || '').trim();

    let rawType: 'expense' | 'income' | 'transfer' = 'expense';
    if (amount > 0) {
      const catLower = categoryName.toLowerCase();
      if (catLower.includes('перевод')) {
        rawType = 'transfer';
      } else {
        rawType = 'income';
      }
    }

    operations.push({
      date,
      externalRef: code,
      categoryName,
      description,
      comment,
      amount: Math.abs(amount),
      rawType,
      status,
    });
  }

  return operations;
}
