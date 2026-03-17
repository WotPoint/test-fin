import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { Category } from '../../types';

interface Props { onClose: () => void; category?: Category; }

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6b7280'];
const ICONS = ['ShoppingCart', 'Car', 'Gamepad2', 'Home', 'Heart', 'BookOpen', 'Shirt', 'MoreHorizontal', 'Coffee', 'Music', 'Utensils', 'Plane'];

export const CategoryModal = ({ onClose, category }: Props) => {
  const { addCategory, updateCategory } = useFinanceStore();
  const [name, setName] = useState(category?.name || '');
  const [type, setType] = useState<'income' | 'expense'>(category?.type || 'expense');
  const [color, setColor] = useState(category?.color || COLORS[0]);
  const [icon, setIcon] = useState(category?.icon || ICONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Введите название категории'); return; }
    if (category) {
      updateCategory(category.id, { name: name.trim(), type, color, icon });
      toast.success('Категория обновлена');
    } else {
      addCategory({ name: name.trim(), type, color, icon, isArchived: false });
      toast.success('Категория создана');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-bg-card border border-bg-border rounded-2xl shadow-card animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="text-text-primary font-semibold">{category ? 'Редактировать' : 'Новая категория'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Название категории"
              className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Тип</label>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={clsx('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                    type === t
                      ? t === 'expense' ? 'bg-expense text-white' : 'bg-income text-white'
                      : 'bg-bg-secondary text-text-secondary border border-bg-border')}>
                  {t === 'expense' ? 'Расход' : 'Доход'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-2">Цвет</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={clsx('w-7 h-7 rounded-full transition-all', color === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-bg-card' : '')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-3.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all">
            {category ? 'Сохранить' : 'Создать'}
          </button>
        </form>
      </div>
    </div>
  );
};
