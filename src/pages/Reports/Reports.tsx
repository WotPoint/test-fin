import { useState, useMemo, Fragment } from 'react';
import { Download, FileText, FileSpreadsheet, Calendar, TrendingUp, TrendingDown, BarChart3, ChevronRight } from 'lucide-react';
import { format, subMonths, subQuarters, subYears, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useFinanceStore } from '../../store/useFinanceStore';
import { exportToCSV, exportToCSVFile } from '../../utils/export';
import { formatMoney, getMonthName } from '../../utils/formatters';
import { chartTooltipStyle } from '../../utils/chartTheme';

type ReportPeriod = 'month' | 'quarter' | 'year' | 'custom';

export const Reports = () => {
  const { transactions, categories, accounts, getMonthlyStats } = useFinanceStore();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const now = new Date();

  const dateRange = useMemo(() => {
    switch (period) {
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom': return { start: new Date(customStart), end: new Date(customEnd) };
    }
  }, [period, customStart, customEnd]);

  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      const d = parseISO(tx.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [transactions, dateRange]);

  const income = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const txCount = filteredTx.length;

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    filteredTx.forEach(tx => {
      if (!map[tx.categoryId]) map[tx.categoryId] = { income: 0, expense: 0 };
      if (tx.type === 'income') map[tx.categoryId].income += tx.amount;
      if (tx.type === 'expense') map[tx.categoryId].expense += tx.amount;
    });
    return Object.entries(map)
      .map(([id, vals]) => ({ cat: categories.find(c => c.id === id), ...vals }))
      .filter(x => x.cat)
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [filteredTx, categories]);

  // Monthly breakdown within range
  const monthlyBreakdown = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    let d = new Date(dateRange.start);
    d.setDate(1);
    while (d <= dateRange.end) {
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const stats = getMonthlyStats(m, y);
      months.push({ month: `${getMonthName(m).slice(0, 3)} ${y}`, income: stats.income, expense: stats.expense });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }, [transactions, dateRange]);

  // Expense pie
  const expPieData = catBreakdown
    .filter(x => x.expense > 0)
    .map(x => ({ name: x.cat!.name, value: x.expense, color: x.cat!.color }))
    .slice(0, 6);

  const periodLabel = {
    month: `${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`,
    quarter: `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`,
    year: `${now.getFullYear()} год`,
    custom: `${customStart} — ${customEnd}`,
  }[period];

  const handleExportExcel = () => {
    exportToCSV(filteredTx, categories, accounts);
    toast.success('Экспорт Excel выполнен');
  };

  const handleExportCSV = () => {
    exportToCSVFile(filteredTx, categories, accounts);
    toast.success('Экспорт CSV выполнен');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Period selector */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          {(['month', 'quarter', 'year', 'custom'] as ReportPeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('px-3 py-2 rounded-xl text-sm font-medium transition-all',
                period === p ? 'bg-brand text-bg-primary' : 'bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary')}>
              {p === 'month' ? 'Месяц' : p === 'quarter' ? 'Квартал' : p === 'year' ? 'Год' : 'Период'}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="bg-bg-card border border-bg-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-brand" />
              <span className="text-text-muted">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="bg-bg-card border border-bg-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-brand" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary text-sm transition-all">
            <FileText size={15} /> CSV
          </button>
          <button onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-income/15 text-income border border-income/20 text-sm hover:bg-income/25 transition-all font-medium">
            <FileSpreadsheet size={15} /> Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-br from-bg-card to-bg-secondary border border-bg-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-brand" />
          <h3 className="text-text-primary font-semibold">{periodLabel}</h3>
          <span className="text-text-muted text-xs">· {txCount} транзакций</span>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <p className="text-text-secondary text-xs mb-1">Доходы</p>
            <p className="text-income text-2xl font-bold font-mono">{formatMoney(income)}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs mb-1">Расходы</p>
            <p className="text-expense text-2xl font-bold font-mono">{formatMoney(expense)}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs mb-1">Чистый доход</p>
            <p className={clsx('text-2xl font-bold font-mono', net >= 0 ? 'text-income' : 'text-expense')}>
              {net >= 0 ? '+' : ''}{formatMoney(net)}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs mb-1">Норма сбережений</p>
            <p className="text-brand text-2xl font-bold">
              {income > 0 ? `${Math.round((net / income) * 100)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Monthly chart */}
        {monthlyBreakdown.length > 1 && (
          <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
            <h3 className="text-text-primary font-semibold mb-4">По месяцам</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyBreakdown} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}К`} width={35} />
                <Tooltip
                  {...chartTooltipStyle}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(v: number, n) => [formatMoney(v), n === 'income' ? 'Доход' : 'Расход']}
                />
                <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expense pie */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-4">Структура расходов</h3>
          {expPieData.length > 0 ? (
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={expPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68}
                    paddingAngle={3} dataKey="value">
                    {expPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    {...chartTooltipStyle}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {expPieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-text-secondary">{d.name}</span>
                    </div>
                    <span className="text-text-primary font-mono">{Math.round((d.value / expense) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-text-muted text-sm py-8 text-center">Нет данных</p>}
        </div>
      </div>

      {/* Detailed table */}
      <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-bg-border flex items-center justify-between">
          <h3 className="text-text-primary font-semibold">Детализация по категориям</h3>
          <span className="text-text-muted text-xs">{catBreakdown.length} категорий</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-border">
                <th className="text-left text-text-muted text-xs px-5 py-3 font-medium">Категория</th>
                <th className="text-right text-text-muted text-xs px-5 py-3 font-medium">Доходы</th>
                <th className="text-right text-text-muted text-xs px-5 py-3 font-medium">Расходы</th>
                <th className="text-right text-text-muted text-xs px-5 py-3 font-medium">Кол-во</th>
                <th className="text-right text-text-muted text-xs px-5 py-3 font-medium">Доля</th>
              </tr>
            </thead>
            <tbody>
              {catBreakdown.map(({ cat, income: catInc, expense: catExp }, i) => {
                const catTxs = filteredTx
                  .filter(t => t.categoryId === cat!.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const catTxCount = catTxs.length;
                const share = expense > 0 && catExp > 0 ? Math.round((catExp / expense) * 100) : 0;
                const isExpanded = expandedCats.has(cat!.id);
                const isLast = i === catBreakdown.length - 1;
                return (
                  <Fragment key={cat!.id}>
                    <tr
                      onClick={() => toggleCat(cat!.id)}
                      className={clsx('border-b border-bg-border hover:bg-bg-hover transition-colors cursor-pointer select-none',
                        isLast && !isExpanded ? 'border-b-0' : '')}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight size={14}
                            className={clsx('text-text-muted transition-transform flex-shrink-0', isExpanded && 'rotate-90')} />
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                            style={{ background: cat!.color + '20', color: cat!.color }}>
                            {cat!.name[0]}
                          </div>
                          <span className="text-text-primary text-sm">{cat!.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {catInc > 0
                          ? <span className="text-income text-sm font-mono">+{formatMoney(catInc)}</span>
                          : <span className="text-text-muted text-sm">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {catExp > 0
                          ? <span className="text-expense text-sm font-mono">-{formatMoney(catExp)}</span>
                          : <span className="text-text-muted text-sm">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-text-secondary text-sm">{catTxCount}</td>
                      <td className="px-5 py-3 text-right">
                        {share > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-bg-border overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${share}%`, background: cat!.color }} />
                            </div>
                            <span className="text-text-muted text-xs w-8 text-right">{share}%</span>
                          </div>
                        ) : <span className="text-text-muted text-sm">—</span>}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className={clsx('border-b border-bg-border bg-bg-secondary/40', isLast && 'border-b-0')}>
                        <td colSpan={5} className="px-5 py-2">
                          <div className="ml-9 border-l-2 pl-4" style={{ borderColor: cat!.color + '60' }}>
                            {catTxs.length === 0
                              ? <p className="text-text-muted text-xs py-2">Нет транзакций</p>
                              : catTxs.map((tx, ti) => {
                                  const acc = accounts.find(a => a.id === tx.accountId);
                                  return (
                                    <div key={tx.id}
                                      className={clsx('flex items-center gap-3 py-2',
                                        ti < catTxs.length - 1 && 'border-b border-bg-border/50')}>
                                      <span className="text-text-muted text-xs w-20 flex-shrink-0 font-mono">
                                        {format(parseISO(tx.date), 'dd.MM.yyyy')}
                                      </span>
                                      <span className="text-text-secondary text-xs flex-1 truncate">
                                        {tx.comment || '—'}
                                      </span>
                                      {acc && (
                                        <span className="text-text-muted text-xs flex-shrink-0">{acc.name}</span>
                                      )}
                                      <span className={clsx('font-mono text-xs font-semibold flex-shrink-0',
                                        tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-brand')}>
                                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}{formatMoney(tx.amount)}
                                      </span>
                                    </div>
                                  );
                                })
                            }
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* All transactions */}
      <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-bg-border">
          <h3 className="text-text-primary font-semibold">Транзакции за период ({filteredTx.length})</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {[...filteredTx]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((tx, i, arr) => {
              const cat = categories.find(c => c.id === tx.categoryId);
              return (
                <div key={tx.id} className={clsx('flex items-center gap-4 px-5 py-3 hover:bg-bg-hover transition-colors',
                  i < arr.length - 1 && 'border-b border-bg-border')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: cat?.color + '20', color: cat?.color }}>
                    <span className="text-xs font-bold">{cat?.name[0] || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm truncate">{tx.comment || cat?.name || '—'}</p>
                    <p className="text-text-muted text-xs">{format(parseISO(tx.date), 'dd.MM.yyyy')} · {cat?.name}</p>
                  </div>
                  <span className={clsx('font-mono font-semibold text-sm',
                    tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-brand')}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}{formatMoney(tx.amount)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
