import { Currency } from '../types';

export const currencySymbols: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
};

export const formatMoney = (amount: number, currency: Currency = 'RUB', compact = false): string => {
  const symbol = currencySymbols[currency];
  if (compact && Math.abs(amount) >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}М`;
  }
  if (compact && Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(0)}К`;
  }
  return `${symbol}${Math.abs(amount).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateShort = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export const formatMonth = (month: number, year: number): string => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
};

export const getMonthName = (month: number): string => {
  const names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return names[month - 1];
};

export const getFrequencyLabel = (freq: string): string => {
  const labels: Record<string, string> = {
    daily: 'Ежедневно',
    weekly: 'Еженедельно',
    monthly: 'Ежемесячно',
    quarterly: 'Ежеквартально',
    yearly: 'Ежегодно',
  };
  return labels[freq] || freq;
};
