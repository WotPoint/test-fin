import { useState, useMemo } from 'react';
import { Tag, SlidersHorizontal, X } from 'lucide-react';
import { format, subMonths, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatMoney, getMonthName } from '../../utils/formatters';

type Period = '1m' | '3m' | '6m' | '1y' | 'custom';

export const Analytics = () => {
  const { transactions, categories, accounts, getMonthlyStats, getCategorySpending, getTotalBalance } = useFinanceStore();
  const [period, setPeriod] = useState<Period>('3m');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const now = new Date();

  const periodMonths = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[period as Exclude<Period, 'custom'>] ?? 3;

  // Derive date range for filtering
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (period === 'custom' && customDateFrom && customDateTo) {
      return { rangeStart: customDateFrom, rangeEnd: customDateTo };
    }
    const end = format(now, 'yyyy-MM-dd');
    const start = format(subMonths(now, periodMonths - 1), 'yyyy-MM-01');
    return { rangeStart: start, rangeEnd: end };
  }, [period, periodMonths, customDateFrom, customDateTo]);

  // Filtered transactions
  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.date < rangeStart || tx.date > rangeEnd) return false;
      if (filterAccount && tx.accountId !== filterAccount) return false;
      if (filterCategory && tx.categoryId !== filterCategory) return false;
      return true;
    });
  }, [transactions, rangeStart, rangeEnd, filterAccount, filterCategory]);

  const hasFilters = !!(filterAccount || filterCategory);

  // Monthly data for bar/line charts (using filteredTx if filters active, else store selectors)
  const monthlyData = useMemo(() => {
    if (period === 'custom' || hasFilters) {
      // Group filtered transactions by month
      const map: Record<string, { income: number; expense: number }> = {};
      filteredTx.forEach(tx => {
        const key = tx.date.slice(0, 7); // yyyy-MM
        if (!map[key]) map[key] = { income: 0, expense: 0 };
        if (tx.type === 'income') map[key].income += tx.amount;
        if (tx.type === 'expense') map[key].expense += tx.amount;
      });
      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, s]) => {
          const [y, m] = key.split('-').map(Number);
          return {
            month: format(new Date(y, m - 1), 'MMM'),
            fullMonth: `${getMonthName(m)} ${y}`,
            income: s.income,
            expense: s.expense,
            net: s.income - s.expense,
            savings: Math.max(s.income - s.expense, 0),
          };
        });
    }
    return Array.from({ length: periodMonths }, (_, i) => {
      const d = subMonths(now, periodMonths - 1 - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const s = getMonthlyStats(m, y);
      return {
        month: format(d, 'MMM'),
        fullMonth: `${getMonthName(m)} ${y}`,
        income: s.income,
        expense: s.expense,
        net: s.net,
        savings: Math.max(s.net, 0),
      };
    });
  }, [filteredTx, transactions, period, periodMonths, hasFilters]);

  // Category spending for pie
  const spending = useMemo(() => {
    const result: Record<string, number> = {};
    filteredTx.forEach(tx => {
      if (tx.type !== 'expense') return;
      result[tx.categoryId] = (result[tx.categoryId] || 0) + tx.amount;
    });
    return result;
  }, [filteredTx]);

  const pieData = useMemo(() => {
    const cats = categories.filter(c => c.type === 'expense' && !c.isArchived);
    return cats
      .map(c => ({ name: c.name, value: spending[c.id] || 0, color: c.color }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories, spending]);

  const totalExpenseMonth = pieData.reduce((s, d) => s + d.value, 0);

  // Daily spending for current month (always current month)
  const dailyData = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTx = transactions.filter(t => t.date === dayStr);
      return {
        day: format(day, 'd'),
        expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

  // Balance forecast (next 3 months)
  const forecastData = useMemo(() => {
    const totalBalance = getTotalBalance();
    const last3 = Array.from({ length: 3 }, (_, i) => {
      const d = subMonths(now, i);
      return getMonthlyStats(d.getMonth() + 1, d.getFullYear()).net;
    });
    const avgMonthly = last3.reduce((s, v) => s + v, 0) / last3.length;
    return Array.from({ length: 4 }, (_, i) => {
      const d = addMonths(now, i);
      return {
        month: format(d, 'MMM yy'),
        balance: Math.round(totalBalance + avgMonthly * i),
        forecast: i > 0,
      };
    });
  }, [transactions]);

  // Stats summary
  const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExpense = monthlyData.reduce((s, d) => s + d.expense, 0);
  const months = period === 'custom' ? Math.max(monthlyData.length, 1) : periodMonths;
  const avgMonthlyExpense = totalExpense / months;
  const avgDailyExpense = avgMonthlyExpense / 30;

  // Top spending categories
  const topCategories = useMemo(() => {
    const catTotals: Record<string, number> = {};
    filteredTx.forEach(tx => {
      if (tx.type !== 'expense') return;
      catTotals[tx.categoryId] = (catTotals[tx.categoryId] || 0) + tx.amount;
    });
    return Object.entries(catTotals)
      .map(([id, total]) => ({ cat: categories.find(c => c.id === id), total }))
      .filter(x => x.cat)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredTx, categories]);

  // Tag stats
  const tagStats = useMemo(() => {
    const tagMap: Record<string, { amount: number; count: number }> = {};
    filteredTx.forEach(tx => {
      if (tx.type !== 'expense') return;
      (tx.tags || []).forEach(tag => {
        if (!tagMap[tag]) tagMap[tag] = { amount: 0, count: 0 };
        tagMap[tag].amount += tx.amount;
        tagMap[tag].count += 1;
      });
    });
    return Object.entries(tagMap)
      .map(([tag, s]) => ({ tag, ...s }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredTx]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-card border border-bg-border rounded-xl p-3 shadow-card">
        <p className="text-text-secondary text-xs mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>
            {p.name === 'income' ? 'Доход' : p.name === 'expense' ? 'Расход' : p.name === 'net' ? 'Чистый' : p.name}: {formatMoney(p.value)}
          </p>
        ))}
      </div>
    );
  };

  const activeFiltersCount = [filterAccount, filterCategory].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Period selector + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-text-secondary text-sm">Период:</span>
        {(['1m', '3m', '6m', '1y'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              period === p ? 'bg-brand text-bg-primary' : 'bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary')}>
            {p === '1m' ? '1 мес.' : p === '3m' ? '3 мес.' : p === '6m' ? '6 мес.' : '1 год'}
          </button>
        ))}
        <button onClick={() => setPeriod('custom')}
          className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            period === 'custom' ? 'bg-brand text-bg-primary' : 'bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary')}>
          Диапазон
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setShowFilters(p => !p)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            showFilters || activeFiltersCount > 0
              ? 'bg-brand/10 border-brand/30 text-brand'
              : 'bg-bg-card border-bg-border text-text-secondary hover:text-text-primary'
          )}
        >
          <SlidersHorizontal size={14} />
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="bg-brand text-bg-primary text-xs rounded-full px-1.5 py-0.5 font-bold leading-none">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-bg-card border border-bg-border rounded-xl">
          <span className="text-text-secondary text-sm">С:</span>
          <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)}
            className="bg-bg-secondary border border-bg-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-brand" />
          <span className="text-text-secondary text-sm">По:</span>
          <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)}
            className="bg-bg-secondary border border-bg-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-brand" />
          {(customDateFrom || customDateTo) && (
            <button onClick={() => { setCustomDateFrom(''); setCustomDateTo(''); }}
              className="text-text-muted hover:text-expense transition-colors">
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-bg-card border border-bg-border rounded-xl">
          <div>
            <label className="block text-text-muted text-xs mb-1">Счёт</label>
            <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
              className="bg-bg-secondary border border-bg-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-brand min-w-36">
              <option value="">Все счета</option>
              {accounts.filter(a => !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-text-muted text-xs mb-1">Категория</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="bg-bg-secondary border border-bg-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-brand min-w-36">
              <option value="">Все категории</option>
              {categories.filter(c => !c.isArchived && c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button onClick={() => { setFilterAccount(''); setFilterCategory(''); }}
                className="px-3 py-2 text-xs text-text-muted hover:text-expense transition-colors">
                Сбросить
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Всего доходов</p>
          <p className="text-income text-xl font-bold font-mono">{formatMoney(totalIncome, 'RUB', true)}</p>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Всего расходов</p>
          <p className="text-expense text-xl font-bold font-mono">{formatMoney(totalExpense, 'RUB', true)}</p>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Ср. расход/мес.</p>
          <p className="text-text-primary text-xl font-bold font-mono">{formatMoney(avgMonthlyExpense, 'RUB', true)}</p>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Ср. расход/день</p>
          <p className="text-text-primary text-xl font-bold font-mono">{formatMoney(avgDailyExpense, 'RUB', true)}</p>
        </div>
      </div>

      {/* Income vs Expense bar chart */}
      <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
        <h3 className="text-text-primary font-semibold mb-4">Доходы vs Расходы</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}К`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v => v === 'income' ? 'Доходы' : v === 'expense' ? 'Расходы' : 'Сбережения'}
              wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
            <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="savings" fill="#00d4aa" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Net income line */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-4">Динамика чистого дохода</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}К`} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="net" stroke="#00d4aa" strokeWidth={2.5} dot={{ fill: '#00d4aa', r: 4 }}
                activeDot={{ r: 6, fill: '#00d4aa' }} name="net" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-4">Расходы по категориям</h3>
          {pieData.length > 0 ? (
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                    paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8 }} labelStyle={{ color: 'var(--text-secondary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.slice(0, 6).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-text-secondary truncate max-w-[80px]">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-text-primary font-mono font-medium">{formatMoney(d.value, 'RUB', true)}</span>
                      <span className="text-text-muted ml-1">({Math.round((d.value / totalExpenseMonth) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-muted text-sm">Нет данных</div>
          )}
        </div>
      </div>

      {/* Daily spending this month */}
      <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
        <h3 className="text-text-primary font-semibold mb-4">Ежедневные траты (текущий месяц)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="expDay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}К` : `${v}`} width={35} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text-secondary)' }} itemStyle={{ color: 'var(--text-primary)' }}
              formatter={(v: number) => [formatMoney(v), 'Расход']} />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expDay)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top categories + Forecast */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top categories */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-4">Топ-5 расходных категорий</h3>
          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map(({ cat, total }, i) => {
                const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
                return (
                  <div key={cat!.id}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted text-xs w-4">{i + 1}</span>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                          style={{ background: cat!.color + '20', color: cat!.color }}>
                          {cat!.name[0]}
                        </div>
                        <span className="text-text-primary text-sm">{cat!.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-text-primary text-sm font-mono">{formatMoney(total, 'RUB', true)}</span>
                        <span className="text-text-muted text-xs ml-2">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-border overflow-hidden ml-10">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat!.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">Нет данных за период</div>
          )}
        </div>

        {/* Balance forecast */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-1">Прогноз баланса</h3>
          <p className="text-text-muted text-xs mb-4">Основан на средней динамике за 3 месяца</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}К`} width={40} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-secondary)' }} itemStyle={{ color: 'var(--text-primary)' }}
                formatter={(v: number) => [formatMoney(v), 'Баланс']} />
              <Area type="monotone" dataKey="balance" stroke="#00d4aa" strokeWidth={2.5}
                fill="url(#balGrad)" dot={{ fill: '#00d4aa', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tag statistics */}
      {tagStats.length > 0 && (
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} className="text-brand" />
            <h3 className="text-text-primary font-semibold">Статистика по тегам</h3>
            <span className="text-text-muted text-xs">(расходы за период)</span>
          </div>
          <div className="space-y-3">
            {tagStats.map(({ tag, amount, count }, i) => {
              const maxAmt = tagStats[0].amount;
              const pct = maxAmt > 0 ? Math.round((amount / maxAmt) * 100) : 0;
              return (
                <div key={tag}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-xs w-4">{i + 1}</span>
                      <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">#{tag}</span>
                      <span className="text-text-muted text-xs">{count} операц.</span>
                    </div>
                    <span className="text-text-primary text-sm font-mono font-medium">{formatMoney(amount, 'RUB', true)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-border overflow-hidden ml-6">
                    <div className="h-full rounded-full bg-brand/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
