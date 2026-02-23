import * as XLSX from 'xlsx';
import { Transaction, Category, Account } from '../types';
import { formatDate } from './formatters';

export const exportToCSV = (
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): void => {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  const rows = transactions.map(tx => ({
    Дата: formatDate(tx.date),
    Тип: tx.type === 'income' ? 'Доход' : tx.type === 'expense' ? 'Расход' : 'Перевод',
    Сумма: tx.type === 'expense' ? -tx.amount : tx.amount,
    Категория: catMap[tx.categoryId] || '',
    Счёт: accMap[tx.accountId] || '',
    Комментарий: tx.comment || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Транзакции');
  XLSX.writeFile(wb, `fintrack-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportToCSVFile = (
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): void => {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  const header = ['Дата', 'Тип', 'Сумма', 'Категория', 'Счёт', 'Комментарий'];
  const rows = transactions.map(tx => [
    formatDate(tx.date),
    tx.type === 'income' ? 'Доход' : tx.type === 'expense' ? 'Расход' : 'Перевод',
    tx.type === 'expense' ? -tx.amount : tx.amount,
    catMap[tx.categoryId] || '',
    accMap[tx.accountId] || '',
    tx.comment || '',
  ]);

  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fintrack-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
