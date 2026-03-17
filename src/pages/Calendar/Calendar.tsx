import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addMonths, subMonths } from 'date-fns';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatMoney } from '../../utils/formatters';
import { TransactionModal } from '../Transactions/TransactionModal';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const Calendar = () => {
  const { transactions, categories, recurringTransactions } = useFinanceStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get days to display (with padding for full weeks)
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDow = (monthStart.getDay() + 6) % 7; // Mon=0
    const paddingStart = Array(startDow).fill(null);
    return [...paddingStart, ...days];
  }, [currentDate]);

  // Group transactions by date
  const txByDate = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    transactions.forEach(tx => {
      if (!map[tx.date]) map[tx.date] = [];
      map[tx.date].push(tx);
    });
    return map;
  }, [transactions]);

  // Upcoming recurring
  const upcomingRecurring = useMemo(() => {
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);
    return recurringTransactions
      .filter(r => r.isActive && new Date(r.nextDate) <= next30)
      .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
      .slice(0, 8);
  }, [recurringTransactions]);

  // Selected day transactions
  const selectedDayTx = selectedDay ? (txByDate[selectedDay] || []) : [];

  // Monthly cashflow forecast
  const cashflowData = useMemo(() => {
    let balance = 0;
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTx = txByDate[dayStr] || [];
      const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      balance += income - expense;
      return { date: dayStr, balance, income, expense };
    });
  }, [transactions, currentDate]);

  const getDayData = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const dayTx = txByDate[key] || [];
    const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, count: dayTx.length };
  };

  const monthIncome = useMemo(() => {
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return t.type === 'income' && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions, currentDate]);

  const monthExpense = useMemo(() => {
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return t.type === 'expense' && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions, currentDate]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 bg-bg-card border border-bg-border rounded-2xl p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentDate(d => subMonths(d, 1))}
                className="p-2 rounded-lg bg-bg-secondary border border-bg-border text-text-secondary hover:text-text-primary transition-colors">
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-text-primary font-semibold text-lg">
                {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <button onClick={() => setCurrentDate(d => addMonths(d, 1))}
                className="p-2 rounded-lg bg-bg-secondary border border-bg-border text-text-secondary hover:text-text-primary transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-income font-mono">+{formatMoney(monthIncome, 'RUB', true)}</span>
              <span className="text-expense font-mono">-{formatMoney(monthExpense, 'RUB', true)}</span>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-text-muted text-xs py-1 font-medium">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = format(day, 'yyyy-MM-dd');
              const { income, expense, count } = getDayData(day);
              const isSelected = selectedDay === key;
              const today = isToday(day);

              return (
                <button key={key} onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={clsx('relative p-1.5 rounded-xl min-h-[60px] flex flex-col items-center transition-all',
                    isSelected ? 'bg-brand/20 border border-brand/40' : today ? 'bg-brand/10 border border-brand/20' : 'hover:bg-bg-hover border border-transparent',
                    !isSameMonth(day, currentDate) ? 'opacity-30' : '')}>
                  <span className={clsx('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    today ? 'bg-brand text-bg-primary font-bold' : isSelected ? 'text-brand' : 'text-text-secondary')}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full mt-0.5">
                    {income > 0 && (
                      <div className="h-1.5 rounded-full bg-income/70 w-full" title={`+${formatMoney(income)}`} />
                    )}
                    {expense > 0 && (
                      <div className="h-1.5 rounded-full bg-expense/70 w-full" title={`-${formatMoney(expense)}`} />
                    )}
                  </div>
                  {count > 0 && (
                    <span className="text-[9px] text-text-muted mt-auto">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day details */}
          {selectedDay && (
            <div className="mt-4 p-4 bg-bg-secondary rounded-xl border border-bg-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-text-primary text-sm font-semibold">
                  {format(parseISO(selectedDay), 'd MMMM yyyy')}
                </h4>
                <button onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 text-brand text-xs hover:underline">
                  <Plus size={12} /> Добавить
                </button>
              </div>
              {selectedDayTx.length === 0 ? (
                <p className="text-text-muted text-sm">Нет транзакций</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayTx.map(tx => {
                    const cat = categories.find(c => c.id === tx.categoryId);
                    return (
                      <div key={tx.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg text-xs flex items-center justify-center"
                            style={{ background: cat?.color + '20', color: cat?.color }}>
                            {cat?.name[0]}
                          </div>
                          <span className="text-text-secondary">{tx.comment || cat?.name}</span>
                        </div>
                        <span className={clsx('font-mono font-semibold',
                          tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-brand')}>
                          {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: upcoming + legend */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
            <h4 className="text-text-primary font-semibold text-sm mb-3">Легенда</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-income" />
                <span className="text-text-secondary text-xs">Доходы</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-expense" />
                <span className="text-text-secondary text-xs">Расходы</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand" />
                <span className="text-text-secondary text-xs">Сегодня</span>
              </div>
            </div>
          </div>

          {/* Upcoming recurring */}
          <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
            <h4 className="text-text-primary font-semibold text-sm mb-3 flex items-center gap-2">
              <Bell size={14} className="text-warning" /> Предстоящие платежи
            </h4>
            {upcomingRecurring.length === 0 ? (
              <p className="text-text-muted text-xs">Нет предстоящих платежей</p>
            ) : (
              <div className="space-y-2">
                {upcomingRecurring.map(r => {
                  const daysUntil = Math.ceil((new Date(r.nextDate).getTime() - new Date().getTime()) / 86400000);
                  return (
                    <div key={r.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-text-primary text-xs font-medium">{r.name}</p>
                        <p className={clsx('text-xs', daysUntil <= 3 ? 'text-warning' : 'text-text-muted')}>
                          {daysUntil <= 0 ? 'Сегодня!' : daysUntil === 1 ? 'Завтра' : `Через ${daysUntil} дн.`}
                        </p>
                      </div>
                      <span className={clsx('font-mono text-xs font-semibold',
                        r.type === 'income' ? 'text-income' : 'text-expense')}>
                        {r.type === 'income' ? '+' : '-'}{formatMoney(r.amount, 'RUB', true)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cash flow summary */}
          <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
            <h4 className="text-text-primary font-semibold text-sm mb-3">Денежный поток</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary flex items-center gap-1"><TrendingUp size={12} className="text-income" /> Приход</span>
                <span className="text-income font-mono">{formatMoney(monthIncome, 'RUB', true)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary flex items-center gap-1"><TrendingDown size={12} className="text-expense" /> Расход</span>
                <span className="text-expense font-mono">{formatMoney(monthExpense, 'RUB', true)}</span>
              </div>
              <div className="h-px bg-bg-border" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-text-primary">Итого</span>
                <span className={clsx('font-mono', monthIncome - monthExpense >= 0 ? 'text-income' : 'text-expense')}>
                  {monthIncome - monthExpense >= 0 ? '+' : ''}{formatMoney(monthIncome - monthExpense, 'RUB', true)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <TransactionModal
          onClose={() => setShowAddModal(false)}
          initialDate={selectedDay || undefined}
        />
      )}
    </div>
  );
};
