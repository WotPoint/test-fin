import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useFinanceStore } from '../../store/useFinanceStore';
import { CategoryModal } from './CategoryModal';
import { BudgetSetModal } from './BudgetSetModal';
import { formatMoney, getMonthName } from '../../utils/formatters';
import { Category } from '../../types';

export const Budgets = () => {
  const { categories, budgets, transactions, deleteBudget, deleteCategory, getCategorySpending, getMonthlyStats } = useFinanceStore();
  const [showCatModal, setShowCatModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>();
  const [editBudgetCat, setEditBudgetCat] = useState<string>('');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const goMonth = (delta: number) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m); setSelectedYear(y);
  };

  const spending = useMemo(() => getCategorySpending(selectedMonth, selectedYear), [transactions, selectedMonth, selectedYear]);
  const stats = useMemo(() => getMonthlyStats(selectedMonth, selectedYear), [transactions, selectedMonth, selectedYear]);
  const prevStats = useMemo(() => {
    const pm = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const py = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    return getMonthlyStats(pm, py);
  }, [transactions, selectedMonth, selectedYear]);

  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isArchived);
  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isArchived);

  const getBudgetForCat = (catId: string) =>
    budgets.find(b => b.categoryId === catId && b.month === selectedMonth && b.year === selectedYear);

  const totalBudgeted = budgets
    .filter(b => b.month === selectedMonth && b.year === selectedYear)
    .reduce((s, b) => s + b.amount, 0);

  const handleDeleteCategory = (cat: Category) => {
    if (cat.isDefault) { toast.error('Нельзя удалить стандартную категорию'); return; }
    deleteCategory(cat.id);
    toast.success('Категория удалена');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => goMonth(-1)} className="p-2 rounded-lg bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-text-primary font-semibold min-w-40 text-center">
            {getMonthName(selectedMonth)} {selectedYear}
          </span>
          <button onClick={() => goMonth(1)} className="p-2 rounded-lg bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary text-sm transition-all">
            <Plus size={15} /> Категория
          </button>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Доходы</p>
          <p className="text-income text-xl font-bold font-mono">{formatMoney(stats.income)}</p>
          <p className={clsx('text-xs mt-1 flex items-center gap-1',
            stats.income >= prevStats.income ? 'text-income' : 'text-expense')}>
            {stats.income >= prevStats.income ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {prevStats.income > 0 ? `${Math.abs(Math.round(((stats.income - prevStats.income) / prevStats.income) * 100))}%` : '—'} к прошлому мес.
          </p>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Расходы</p>
          <p className="text-expense text-xl font-bold font-mono">{formatMoney(stats.expense)}</p>
          <p className={clsx('text-xs mt-1 flex items-center gap-1',
            stats.expense <= prevStats.expense ? 'text-income' : 'text-expense')}>
            {stats.expense <= prevStats.expense ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            {prevStats.expense > 0 ? `${Math.abs(Math.round(((stats.expense - prevStats.expense) / prevStats.expense) * 100))}%` : '—'} к прошлому мес.
          </p>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Бюджет (план)</p>
          <p className="text-text-primary text-xl font-bold font-mono">{formatMoney(totalBudgeted)}</p>
          <p className="text-text-muted text-xs mt-1">{budgets.filter(b => b.month === selectedMonth && b.year === selectedYear).length} категорий</p>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-text-secondary text-xs mb-1">Остаток бюджета</p>
          <p className={clsx('text-xl font-bold font-mono', totalBudgeted - stats.expense >= 0 ? 'text-income' : 'text-expense')}>
            {formatMoney(Math.abs(totalBudgeted - stats.expense))}
          </p>
          <p className="text-text-muted text-xs mt-1">{totalBudgeted > 0 ? `${Math.round((stats.expense / totalBudgeted) * 100)}% использовано` : '—'}</p>
        </div>
      </div>

      {/* Budget categories */}
      <div>
        <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-expense" />
          Расходные категории и бюджеты
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {expenseCategories.map(cat => {
            const budget = getBudgetForCat(cat.id);
            const spent = spending[cat.id] || 0;
            const pct = budget ? Math.min(Math.round((spent / budget.amount) * 100), 100) : 0;
            const isOver = budget && spent > budget.amount;
            const isWarning = budget && pct >= (budget.alertThreshold || 80) && !isOver;
            const prevSpending = (() => {
              const pm = selectedMonth === 1 ? 12 : selectedMonth - 1;
              const py = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
              const { transactions: txs } = useFinanceStore.getState();
              return txs.filter(t => {
                const d = new Date(t.date);
                return t.categoryId === cat.id && t.type === 'expense' && d.getMonth() + 1 === pm && d.getFullYear() === py;
              }).reduce((s, t) => s + t.amount, 0);
            })();

            return (
              <div key={cat.id} className={clsx('bg-bg-card border rounded-2xl p-4 transition-all',
                isOver ? 'border-expense/40' : isWarning ? 'border-warning/40' : 'border-bg-border hover:border-brand/30')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: cat.color + '20', color: cat.color }}>
                      <span className="text-sm font-bold">{cat.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-medium flex items-center gap-1.5">
                        {cat.name}
                        {isOver && <AlertTriangle size={12} className="text-expense" />}
                        {isWarning && <AlertTriangle size={12} className="text-warning" />}
                      </p>
                      {prevSpending > 0 && (
                        <p className={clsx('text-xs', spent > prevSpending ? 'text-expense' : 'text-income')}>
                          {spent > prevSpending ? '↑' : '↓'} {Math.abs(Math.round(((spent - prevSpending) / prevSpending) * 100))}% vs пред. мес.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditBudgetCat(cat.id); setShowBudgetModal(true); }}
                      className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    {!cat.isDefault && (
                      <button onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className={clsx(isOver ? 'text-expense' : 'text-text-secondary')}>
                      {formatMoney(spent)}
                    </span>
                    {budget ? (
                      <span className="text-text-muted">из {formatMoney(budget.amount)}</span>
                    ) : (
                      <button onClick={() => { setEditBudgetCat(cat.id); setShowBudgetModal(true); }}
                        className="text-brand hover:underline">
                        + Установить бюджет
                      </button>
                    )}
                  </div>
                  {budget && (
                    <div className="h-2 rounded-full bg-bg-border overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all',
                        isOver ? 'bg-expense' : isWarning ? 'bg-warning' : 'bg-brand')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {budget && (
                    <p className={clsx('text-xs', isOver ? 'text-expense' : 'text-text-muted')}>
                      {isOver ? `Превышение на ${formatMoney(spent - budget.amount)}` : `Остаток: ${formatMoney(budget.amount - spent)}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Income categories */}
      <div>
        <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-income" />
          Категории доходов
        </h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {incomeCategories.map(cat => {
            const txCount = transactions.filter(t => t.categoryId === cat.id).length;
            return (
              <div key={cat.id} className="bg-bg-card border border-bg-border rounded-xl p-3 flex items-center justify-between group hover:border-brand/30 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: cat.color + '20', color: cat.color }}>
                    <span className="text-xs font-bold">{cat.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-text-primary text-xs font-medium">{cat.name}</p>
                    <p className="text-text-muted text-xs">{txCount} транз.</p>
                  </div>
                </div>
                {!cat.isDefault && (
                  <button onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showCatModal && (
        <CategoryModal
          onClose={() => { setShowCatModal(false); setEditCategory(undefined); }}
          category={editCategory}
        />
      )}
      {showBudgetModal && (
        <BudgetSetModal
          onClose={() => setShowBudgetModal(false)}
          categoryId={editBudgetCat}
          month={selectedMonth}
          year={selectedYear}
        />
      )}
    </div>
  );
};
