import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, BarChart2, Target, Zap } from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatMoney, formatDateShort } from '../../utils/formatters';
import { clsx } from 'clsx';

const COLORS = ['#00d4aa', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#10b981'];

const StatCard = ({ title, value, sub, icon: Icon, color, trend }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string; trend?: number;
}) => (
  <div className="bg-bg-card border border-bg-border rounded-2xl p-5 hover:border-brand/30 transition-all shadow-card">
    <div className="flex items-start justify-between mb-4">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <span className={clsx('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
          trend >= 0 ? 'text-income bg-income/10' : 'text-expense bg-expense/10')}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-text-secondary text-xs mb-1">{title}</p>
    <p className="text-text-primary text-2xl font-bold font-mono">{value}</p>
    {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
  </div>
);

export const Dashboard = () => {
  const { transactions, accounts, categories, goals, getAccountBalance, getTotalBalance, getMonthlyStats, getCategorySpending } = useFinanceStore();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const stats = useMemo(() => getMonthlyStats(currentMonth, currentYear), [transactions, currentMonth, currentYear]);
  const prevStats = useMemo(() => getMonthlyStats(prevMonth, prevYear), [transactions, prevMonth, prevYear]);
  const totalBalance = getTotalBalance();
  const spending = useMemo(() => getCategorySpending(currentMonth, currentYear), [transactions, currentMonth, currentYear]);

  const incomeTrend = prevStats.income > 0
    ? Math.round(((stats.income - prevStats.income) / prevStats.income) * 100) : 0;
  const expenseTrend = prevStats.expense > 0
    ? Math.round(((stats.expense - prevStats.expense) / prevStats.expense) * 100) : 0;

  // Last 30 days area chart
  const areaData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(now, 29), end: now });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTx = transactions.filter(tx => tx.date === dayStr);
      return {
        date: format(day, 'dd.MM'),
        income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

  // Category pie
  const pieData = useMemo(() => {
    const cats = categories.filter(c => c.type === 'expense' && !c.isArchived);
    return cats
      .map(c => ({ name: c.name, value: spending[c.id] || 0, color: c.color }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [categories, spending]);

  // Monthly comparison
  const monthComparison = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const s = getMonthlyStats(m, y);
      return { month: format(d, 'MMM'), income: s.income, expense: s.expense };
    });
    return months;
  }, [transactions]);

  // Recent transactions
  const recent = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [transactions]
  );

  // Active goals
  const activeGoals = goals.filter(g => !g.isCompleted).slice(0, 3);

  const avgDailyExpense = stats.expense / now.getDate();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Общий баланс" value={formatMoney(totalBalance)}
          icon={Wallet} color="bg-brand/15 text-brand"
          sub={`${accounts.filter(a => !a.isArchived).length} счёта`}
        />
        <StatCard
          title="Доходы (месяц)" value={formatMoney(stats.income)}
          icon={ArrowUpRight} color="bg-income/15 text-income"
          trend={incomeTrend}
          sub={`Пред. ${formatMoney(prevStats.income)}`}
        />
        <StatCard
          title="Расходы (месяц)" value={formatMoney(stats.expense)}
          icon={ArrowDownRight} color="bg-expense/15 text-expense"
          trend={expenseTrend}
          sub={`Пред. ${formatMoney(prevStats.expense)}`}
        />
        <StatCard
          title="Средний расход/день" value={formatMoney(avgDailyExpense)}
          icon={Zap} color="bg-warning/15 text-warning"
          sub={`Чистый: ${stats.net >= 0 ? '+' : ''}${formatMoney(stats.net)}`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="xl:col-span-2 bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-4">Доходы и расходы (30 дней)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}К` : `${v}`} width={40} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                formatter={(v: number, name) => [formatMoney(v), name === 'income' ? 'Доход' : 'Расход']}
              />
              <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incGrad)" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-4">Расходы по категориям</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8 }}
                    formatter={(v: number) => [formatMoney(v), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {pieData.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-text-secondary truncate max-w-[100px]">{d.name}</span>
                    </div>
                    <span className="text-text-primary font-mono font-medium">{formatMoney(d.value, 'RUB', true)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-muted text-sm">
              Нет расходов за этот месяц
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Monthly comparison */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <h3 className="text-text-primary font-semibold mb-4">Сравнение месяцев</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthComparison} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}К`} width={35} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8 }}
                formatter={(v: number, n) => [formatMoney(v), n === 'income' ? 'Доход' : 'Расход']}
              />
              <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent transactions */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-primary font-semibold">Последние операции</h3>
            <a href="/transactions" className="text-brand text-xs hover:underline">Все</a>
          </div>
          {recent.length > 0 ? (
            <div className="space-y-3">
              {recent.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                return (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: cat?.color + '20', color: cat?.color }}>
                        {cat?.name[0] || '?'}
                      </div>
                      <div>
                        <p className="text-text-primary text-xs font-medium leading-tight">
                          {tx.comment || cat?.name}
                        </p>
                        <p className="text-text-muted text-xs">{formatDateShort(tx.date)}</p>
                      </div>
                    </div>
                    <span className={clsx('font-mono font-semibold text-sm',
                      tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-text-secondary')}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatMoney(tx.amount, 'RUB', true)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <BarChart2 size={32} className="text-text-muted opacity-30 mb-2" />
              <p className="text-text-muted text-sm">Нет транзакций</p>
              <p className="text-text-muted text-xs mt-1">Добавьте первую операцию</p>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-primary font-semibold">Финансовые цели</h3>
            <a href="/goals" className="text-brand text-xs hover:underline">Все</a>
          </div>
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
              return (
                <div key={goal.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-text-primary text-sm font-medium">{goal.name}</p>
                      <p className="text-text-muted text-xs">{formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: goal.color }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-border overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: goal.color }} />
                  </div>
                </div>
              );
            })}
            {activeGoals.length === 0 && (
              <p className="text-text-muted text-sm text-center py-4">Нет активных целей</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
