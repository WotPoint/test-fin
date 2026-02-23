import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceStore } from '../../store/useFinanceStore';
import { getMonthName } from '../../utils/formatters';

interface Props { onClose: () => void; categoryId: string; month: number; year: number; }

export const BudgetSetModal = ({ onClose, categoryId, month, year }: Props) => {
  const { categories, budgets, setBudget, deleteBudget } = useFinanceStore();
  const cat = categories.find(c => c.id === categoryId);
  const existing = budgets.find(b => b.categoryId === categoryId && b.month === month && b.year === year);

  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [threshold, setThreshold] = useState(existing?.alertThreshold?.toString() || '80');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Введите корректную сумму'); return; }
    setBudget(categoryId, month, year, amt, parseInt(threshold) || 80);
    toast.success('Бюджет установлен');
    onClose();
  };

  const handleDelete = () => {
    if (existing) { deleteBudget(existing.id); toast.success('Бюджет удалён'); }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-bg-card border border-bg-border rounded-2xl shadow-card animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="text-text-primary font-semibold">
            Бюджет: {cat?.name} · {getMonthName(month)}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Лимит бюджета (₽)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-mono">₽</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0" min="1"
                className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-8 pr-4 py-3 text-text-primary font-mono
                  focus:outline-none focus:border-brand" />
            </div>
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">
              Уведомление при использовании {threshold}%
            </label>
            <input type="range" min="10" max="100" step="5" value={threshold} onChange={e => setThreshold(e.target.value)}
              className="w-full accent-brand" />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>10%</span><span>100%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-3.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all">
              {existing ? 'Обновить' : 'Установить'}
            </button>
            {existing && (
              <button type="button" onClick={handleDelete}
                className="px-4 py-3.5 rounded-xl bg-expense/15 text-expense font-semibold text-sm hover:bg-expense/25 transition-all">
                Удалить
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
