import { useState } from 'react';
import { Plus, Target, Trash2, Edit2, CheckCircle2, PlusCircle, ChevronDown, ChevronUp, Plane, Shield, Laptop, Home, Car, Star, Gift, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
import { format, differenceInDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useFinanceStore } from '../../store/useFinanceStore';
import { GoalModal } from './GoalModal';
import { Goal } from '../../types';
import { formatMoney, formatDateShort } from '../../utils/formatters';

const iconMap: Record<string, React.ElementType> = {
  Plane, Shield, Laptop, Home, Car, Star, Gift, Smartphone, Target,
};

export const Goals = () => {
  const { goals, deleteGoal, addToGoal } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | undefined>();
  const [addingTo, setAddingTo] = useState<string>('');
  const [addAmount, setAddAmount] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeGoals = goals.filter(g => !g.isCompleted);
  const completedGoals = goals.filter(g => g.isCompleted);

  const handleAddFunds = (goalId: string) => {
    const amt = parseFloat(addAmount);
    if (!amt || amt <= 0) { toast.error('Введите сумму'); return; }
    addToGoal(goalId, amt);
    toast.success(`+${formatMoney(amt)} добавлено к цели`);
    setAddingTo(''); setAddAmount('');
  };

  const handleDelete = (id: string) => {
    deleteGoal(id);
    toast.success('Цель удалена');
    setConfirmDeleteId(null);
  };

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
    const remaining = goal.targetAmount - goal.currentAmount;
    const Icon = iconMap[goal.icon] || Target;
    const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null;
    const monthlyNeeded = daysLeft && daysLeft > 0 ? Math.ceil(remaining / (daysLeft / 30)) : null;
    const [showHistory, setShowHistory] = useState(false);
    const contributions = goal.contributions || [];

    return (
      <div className={clsx('bg-bg-card border rounded-2xl p-5 transition-all group shadow-card',
        goal.isCompleted ? 'border-income/30' : 'border-bg-border hover:border-brand/30')}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: goal.color + '20' }}>
              <Icon size={22} style={{ color: goal.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-text-primary font-semibold">{goal.name}</p>
                {goal.isCompleted && <CheckCircle2 size={16} className="text-income" />}
              </div>
              {goal.description && <p className="text-text-muted text-xs">{goal.description}</p>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setEditGoal(goal); setShowModal(true); }}
              className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={() => setConfirmDeleteId(goal.id)}
              className="p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-primary font-bold font-mono">{formatMoney(goal.currentAmount)}</span>
            <span className="text-text-muted text-sm font-mono">/ {formatMoney(goal.targetAmount)}</span>
          </div>
          <div className="h-3 rounded-full bg-bg-border overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-bold" style={{ color: goal.color }}>{pct}%</span>
            {remaining > 0 && <span className="text-text-muted text-xs">Ещё {formatMoney(remaining)}</span>}
          </div>
        </div>

        {/* Info */}
        <div className="flex gap-3 text-xs text-text-muted mb-3">
          {goal.deadline && (
            <span className={clsx(daysLeft !== null && daysLeft < 30 ? 'text-warning' : '')}>
              📅 {daysLeft !== null ? daysLeft > 0 ? `${daysLeft} дней` : 'Просрочено' : format(parseISO(goal.deadline), 'dd.MM.yyyy')}
            </span>
          )}
          {monthlyNeeded && monthlyNeeded > 0 && (
            <span className="text-brand">💡 {formatMoney(monthlyNeeded)}/мес.</span>
          )}
        </div>

        {/* Add funds */}
        {!goal.isCompleted && (
          addingTo === goal.id ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">₽</span>
                <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                  placeholder="Сумма" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddFunds(goal.id); if (e.key === 'Escape') setAddingTo(''); }}
                  className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-8 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-brand" />
              </div>
              <button onClick={() => handleAddFunds(goal.id)}
                className="px-3 py-2 rounded-xl bg-income text-white text-sm font-medium hover:bg-income/90 transition-colors">
                +
              </button>
              <button onClick={() => setAddingTo('')}
                className="px-3 py-2 rounded-xl bg-bg-secondary border border-bg-border text-text-secondary text-sm transition-colors">
                ✕
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingTo(goal.id)}
              className="w-full py-2 rounded-xl border border-dashed border-bg-border text-text-muted text-sm
                hover:border-brand/50 hover:text-brand transition-all flex items-center justify-center gap-1.5">
              <PlusCircle size={14} /> Пополнить цель
            </button>
          )
        )}

        {/* Contribution history */}
        {contributions.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowHistory(p => !p)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors w-full"
            >
              {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              История пополнений ({contributions.length})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {[...contributions].reverse().map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs py-1 border-b border-bg-border last:border-0">
                    <span className="text-text-muted">{formatDateShort(c.date)}</span>
                    {c.comment && <span className="text-text-muted truncate mx-2 flex-1">{c.comment}</span>}
                    <span className="text-income font-mono font-medium">+{formatMoney(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header actions */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-text-secondary text-sm">{activeGoals.length} активных · {completedGoals.length} выполнено</p>
        </div>
        <button onClick={() => { setEditGoal(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all">
          <Plus size={16} /> Новая цель
        </button>
      </div>

      {/* Summary */}
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-bg-card border border-bg-border rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Всего целей</p>
            <p className="text-text-primary text-2xl font-bold">{goals.length}</p>
          </div>
          <div className="bg-bg-card border border-bg-border rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Накоплено</p>
            <p className="text-income text-2xl font-bold font-mono">
              {formatMoney(activeGoals.reduce((s, g) => s + g.currentAmount, 0), 'RUB', true)}
            </p>
          </div>
          <div className="bg-bg-card border border-bg-border rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Осталось</p>
            <p className="text-text-primary text-2xl font-bold font-mono">
              {formatMoney(activeGoals.reduce((s, g) => s + (g.targetAmount - g.currentAmount), 0), 'RUB', true)}
            </p>
          </div>
          <div className="bg-bg-card border border-bg-border rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Выполнено</p>
            <p className="text-brand text-2xl font-bold">{completedGoals.length}</p>
          </div>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 ? (
        <div>
          <h3 className="text-text-primary font-semibold mb-4">Активные цели</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {activeGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <Target size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
          <p className="text-text-secondary mb-2">У вас нет активных целей</p>
          <p className="text-text-muted text-sm mb-6">Создайте первую финансовую цель и начните откладывать</p>
          <button onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-xl bg-brand text-bg-primary font-semibold hover:bg-brand-light transition-all">
            Создать цель
          </button>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-income" />
            Выполненные цели
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {completedGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {showModal && (
        <GoalModal onClose={() => { setShowModal(false); setEditGoal(undefined); }} goal={editGoal} />
      )}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Удалить цель?"
          message="Прогресс накоплений будет потерян."
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};
