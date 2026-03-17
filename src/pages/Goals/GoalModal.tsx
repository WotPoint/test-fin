import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { Goal } from '../../types';

interface Props { onClose: () => void; goal?: Goal; }

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
const ICONS = ['Plane', 'Shield', 'Laptop', 'Home', 'Car', 'Star', 'Gift', 'Smartphone', 'Target'];

export const GoalModal = ({ onClose, goal }: Props) => {
  const { addGoal, updateGoal } = useFinanceStore();
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount?.toString() || '0');
  const [deadline, setDeadline] = useState(goal?.deadline || '');
  const [color, setColor] = useState(goal?.color || COLORS[0]);
  const [icon, setIcon] = useState(goal?.icon || ICONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    if (!name.trim() || !target || target <= 0) { toast.error('Заполните название и сумму'); return; }
    const data = {
      name: name.trim(), description: description.trim() || undefined,
      targetAmount: target, currentAmount: parseFloat(currentAmount) || 0,
      deadline: deadline || undefined, icon, color,
    };
    if (goal) {
      updateGoal(goal.id, data);
      toast.success('Цель обновлена');
    } else {
      addGoal(data);
      toast.success('Цель создана!');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border border-bg-border rounded-2xl shadow-card animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-bg-border sticky top-0 bg-bg-card rounded-t-2xl">
          <h2 className="text-text-primary font-semibold">{goal ? 'Редактировать цель' : 'Новая цель'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Название цели</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Отпуск в Италии"
              className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Описание</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Дополнительные детали..."
              className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary text-sm focus:outline-none focus:border-brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary text-xs mb-1.5">Целевая сумма</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₽</span>
                <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
                  placeholder="0" min="1"
                  className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-7 pr-3 py-3 text-text-primary font-mono text-sm focus:outline-none focus:border-brand" />
              </div>
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1.5">Уже накоплено</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₽</span>
                <input type="number" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)}
                  placeholder="0" min="0"
                  className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-7 pr-3 py-3 text-text-primary font-mono text-sm focus:outline-none focus:border-brand" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Дедлайн (необязательно)</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-2">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={clsx('px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    icon === ic ? 'bg-brand text-bg-primary' : 'bg-bg-secondary text-text-secondary border border-bg-border hover:text-text-primary')}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-2">Цвет</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={clsx('w-8 h-8 rounded-full transition-all', color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-bg-card' : '')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-3.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all">
            {goal ? 'Сохранить' : 'Создать цель'}
          </button>
        </form>
      </div>
    </div>
  );
};
