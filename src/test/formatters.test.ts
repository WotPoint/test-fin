import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatDate,
  formatDateShort,
  formatMonth,
  getMonthName,
  getFrequencyLabel,
  currencySymbols,
} from '../utils/formatters';

// ─── formatMoney ──────────────────────────────────────────────────────────────

describe('formatMoney', () => {
  describe('нормальные сценарии', () => {
    it('форматирует целые рубли', () => {
      expect(formatMoney(100)).toBe('₽100');
    });

    it('форматирует тысячи с разделителем', () => {
      const result = formatMoney(1500);
      expect(result).toMatch(/₽.*1.*500/);
    });

    it('форматирует доллары', () => {
      expect(formatMoney(100, 'USD')).toBe('$100');
    });

    it('форматирует евро', () => {
      expect(formatMoney(200, 'EUR')).toBe('€200');
    });

    it('форматирует фунты', () => {
      expect(formatMoney(50, 'GBP')).toBe('£50');
    });

    it('форматирует юани', () => {
      expect(formatMoney(300, 'CNY')).toBe('¥300');
    });

    it('не показывает дробную часть', () => {
      const result = formatMoney(1000);
      expect(result).not.toContain('.');
      expect(result).not.toContain(',');
    });
  });

  describe('compact-режим', () => {
    it('миллионы → М', () => {
      expect(formatMoney(2500000, 'RUB', true)).toBe('₽2.5М');
    });

    it('ровно 1 миллион', () => {
      expect(formatMoney(1000000, 'RUB', true)).toBe('₽1.0М');
    });

    it('тысячи → К', () => {
      expect(formatMoney(15000, 'RUB', true)).toBe('₽15К');
    });

    it('ровно 1000 → К', () => {
      expect(formatMoney(1000, 'RUB', true)).toBe('₽1К');
    });

    it('менее 1000 — без суффикса', () => {
      expect(formatMoney(999, 'RUB', true)).toBe('₽999');
    });

    it('compact=false по умолчанию не сокращает', () => {
      const result = formatMoney(15000);
      expect(result).not.toContain('К');
      expect(result).not.toContain('М');
    });
  });

  describe('граничные случаи', () => {
    it('ноль', () => {
      expect(formatMoney(0)).toBe('₽0');
    });

    it('отрицательная сумма — возвращает абсолютное значение', () => {
      expect(formatMoney(-500)).toBe('₽500');
    });

    // compact-режим не берёт Math.abs — знак сохраняется (в отличие от обычного режима)
    it('отрицательный миллион в compact сохраняет знак', () => {
      expect(formatMoney(-2000000, 'RUB', true)).toBe('₽-2.0М');
    });

    it('дробная сумма округляется до целых', () => {
      const result = formatMoney(1234.99);
      expect(result).not.toContain('.');
    });

    it('очень большое число', () => {
      const result = formatMoney(999999999);
      expect(result).toContain('₽');
    });
  });

  describe('currencySymbols — все валюты определены', () => {
    const currencies = ['RUB', 'USD', 'EUR', 'GBP', 'CNY'] as const;
    currencies.forEach(c => {
      it(`символ для ${c} существует`, () => {
        expect(currencySymbols[c]).toBeTruthy();
      });
    });
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('возвращает непустую строку для валидной даты', () => {
    const result = formatDate('2024-03-15');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('содержит год', () => {
    expect(formatDate('2024-01-01')).toContain('2024');
  });

  it('разные месяцы дают разный результат', () => {
    const jan = formatDate('2024-01-15');
    const jul = formatDate('2024-07-15');
    expect(jan).not.toBe(jul);
  });

  it('разные годы дают разный результат', () => {
    const y2023 = formatDate('2023-06-01');
    const y2024 = formatDate('2024-06-01');
    expect(y2023).not.toBe(y2024);
  });
});

// ─── formatDateShort ──────────────────────────────────────────────────────────

describe('formatDateShort', () => {
  it('возвращает строку без года', () => {
    const result = formatDateShort('2024-03-15');
    expect(result).toBeTruthy();
    expect(result).not.toContain('2024');
  });

  it('короче полной даты', () => {
    const full = formatDate('2024-03-15');
    const short = formatDateShort('2024-03-15');
    expect(short.length).toBeLessThan(full.length);
  });

  it('разные месяцы дают разный результат', () => {
    const jan = formatDateShort('2024-01-15');
    const dec = formatDateShort('2024-12-15');
    expect(jan).not.toBe(dec);
  });
});

// ─── formatMonth ──────────────────────────────────────────────────────────────

describe('formatMonth', () => {
  it('содержит год', () => {
    expect(formatMonth(3, 2024)).toContain('2024');
  });

  it('разные месяцы дают разный результат', () => {
    const jan = formatMonth(1, 2024);
    const dec = formatMonth(12, 2024);
    expect(jan).not.toBe(dec);
  });

  it('разные годы дают разный результат', () => {
    const y2023 = formatMonth(1, 2023);
    const y2024 = formatMonth(1, 2024);
    expect(y2023).not.toBe(y2024);
  });
});

// ─── getMonthName ─────────────────────────────────────────────────────────────

describe('getMonthName', () => {
  it('возвращает Январь для месяца 1', () => {
    expect(getMonthName(1)).toBe('Январь');
  });

  it('возвращает Декабрь для месяца 12', () => {
    expect(getMonthName(12)).toBe('Декабрь');
  });

  it('все 12 месяцев уникальны', () => {
    const names = Array.from({ length: 12 }, (_, i) => getMonthName(i + 1));
    const unique = new Set(names);
    expect(unique.size).toBe(12);
  });

  it('все 12 месяцев — непустые строки', () => {
    for (let m = 1; m <= 12; m++) {
      expect(getMonthName(m)).toBeTruthy();
    }
  });

  const expected: Record<number, string> = {
    1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
    5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
    9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь',
  };

  Object.entries(expected).forEach(([num, name]) => {
    it(`месяц ${num} → ${name}`, () => {
      expect(getMonthName(Number(num))).toBe(name);
    });
  });
});

// ─── getFrequencyLabel ────────────────────────────────────────────────────────

describe('getFrequencyLabel', () => {
  const cases = [
    ['daily', 'Ежедневно'],
    ['weekly', 'Еженедельно'],
    ['monthly', 'Ежемесячно'],
    ['quarterly', 'Ежеквартально'],
    ['yearly', 'Ежегодно'],
  ] as const;

  cases.forEach(([freq, label]) => {
    it(`${freq} → ${label}`, () => {
      expect(getFrequencyLabel(freq)).toBe(label);
    });
  });

  it('неизвестная частота возвращается как есть', () => {
    expect(getFrequencyLabel('biweekly')).toBe('biweekly');
  });

  it('пустая строка возвращается как есть', () => {
    expect(getFrequencyLabel('')).toBe('');
  });

  it('произвольная строка возвращается как есть', () => {
    expect(getFrequencyLabel('never')).toBe('never');
  });
});
