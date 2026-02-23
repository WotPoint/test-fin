import { useState, useRef } from 'react';
import { X, Upload, Camera, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { TransactionType } from '../../types';

interface TransactionModalProps {
  onClose: () => void;
  editId?: string;
}

export const TransactionModal = ({ onClose, editId }: TransactionModalProps) => {
  const { transactions, accounts, categories, subcategories, addTransaction, updateTransaction } = useFinanceStore();

  const editing = editId ? transactions.find(t => t.id === editId) : undefined;

  const [type, setType] = useState<TransactionType>(editing?.type || 'expense');
  const [amount, setAmount] = useState(editing?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState(editing?.subcategoryId || '');
  const [accountId, setAccountId] = useState(editing?.accountId || (accounts[0]?.id || ''));
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId || '');
  const [date, setDate] = useState(editing?.date || format(new Date(), 'yyyy-MM-dd'));
  const [comment, setComment] = useState(editing?.comment || '');
  const [receipt, setReceipt] = useState(editing?.receiptPhoto || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredCats = categories.filter(c => c.type === (type === 'transfer' ? 'expense' : type) && !c.isArchived);
  const filteredSubs = subcategories.filter(s => s.categoryId === categoryId);
  const activeAccounts = accounts.filter(a => !a.isArchived);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setReceipt(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Введите корректную сумму'); return; }
    if (type !== 'transfer' && !categoryId) { toast.error('Выберите категорию'); return; }
    if (!accountId) { toast.error('Выберите счёт'); return; }
    if (type === 'transfer' && !toAccountId) { toast.error('Выберите счёт назначения'); return; }

    const data = {
      type, amount: amt, categoryId: type === 'transfer' ? 'cat-other-exp' : categoryId,
      subcategoryId: subcategoryId || undefined, accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date, comment: comment || undefined,
      receiptPhoto: receipt || undefined,
    };

    if (editId) {
      updateTransaction(editId, data);
      toast.success('Транзакция обновлена');
    } else {
      addTransaction(data);
      toast.success(type === 'income' ? 'Доход добавлен!' : type === 'expense' ? 'Расход добавлен!' : 'Перевод выполнен!');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border border-bg-border rounded-2xl shadow-card animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border sticky top-0 bg-bg-card rounded-t-2xl">
          <h2 className="text-text-primary font-semibold">{editId ? 'Редактировать' : 'Новая транзакция'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type tabs */}
          <div className="flex rounded-xl bg-bg-secondary p-1 gap-1">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setCategoryId(''); setSubcategoryId(''); }}
                className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  type === t
                    ? t === 'income' ? 'bg-income text-white' : t === 'expense' ? 'bg-expense text-white' : 'bg-brand text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary')}>
                {t === 'expense' ? 'Расход' : t === 'income' ? 'Доход' : 'Перевод'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Сумма</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-mono">₽</span>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0" min="0" step="0.01" required
                className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-8 pr-4 py-3 text-text-primary font-mono text-lg
                  focus:outline-none focus:border-brand transition-colors placeholder-text-muted"
              />
            </div>
          </div>

          {/* Category (not for transfer) */}
          {type !== 'transfer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1.5">Категория</label>
                <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubcategoryId(''); }}
                  className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary
                    focus:outline-none focus:border-brand transition-colors text-sm">
                  <option value="">Выберите...</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1.5">Подкатегория</label>
                <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)}
                  disabled={!categoryId || filteredSubs.length === 0}
                  className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary
                    focus:outline-none focus:border-brand transition-colors text-sm disabled:opacity-40">
                  <option value="">—</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Accounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary text-xs mb-1.5">
                {type === 'transfer' ? 'Откуда' : 'Счёт'}
              </label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}
                className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary
                  focus:outline-none focus:border-brand transition-colors text-sm">
                {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {type === 'transfer' && (
              <div>
                <label className="block text-text-secondary text-xs mb-1.5">Куда</label>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)}
                  className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary
                    focus:outline-none focus:border-brand transition-colors text-sm">
                  <option value="">Выберите...</option>
                  {activeAccounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Дата</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-9 pr-4 py-3 text-text-primary
                  focus:outline-none focus:border-brand transition-colors text-sm" />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Комментарий</label>
            <input type="text" value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Необязательно..."
              className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary
                focus:outline-none focus:border-brand transition-colors text-sm placeholder-text-muted" />
          </div>

          {/* Receipt */}
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Чек (фото)</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            {receipt ? (
              <div className="relative">
                <img src={receipt} alt="Чек" className="w-full h-32 object-cover rounded-xl" />
                <button type="button" onClick={() => setReceipt('')}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full py-3 border border-dashed border-bg-border rounded-xl text-text-muted text-sm
                  hover:border-brand/50 hover:text-brand transition-all flex items-center justify-center gap-2">
                <Camera size={16} />
                Прикрепить фото чека
              </button>
            )}
          </div>

          {/* Submit */}
          <button type="submit"
            className={clsx('w-full py-3.5 rounded-xl font-semibold text-sm transition-all',
              type === 'income'
                ? 'bg-income hover:bg-income/90 text-white'
                : type === 'expense'
                  ? 'bg-expense hover:bg-expense/90 text-white'
                  : 'bg-brand hover:bg-brand-light text-bg-primary')}>
            {editId ? 'Сохранить' : type === 'income' ? 'Добавить доход' : type === 'expense' ? 'Добавить расход' : 'Выполнить перевод'}
          </button>
        </form>
      </div>
    </div>
  );
};
