import { useState } from 'react';
import { X, Plus, Trash2, RefreshCw, Play, Pause, Edit2, Check } from 'lucide-react';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { RecurringFrequency, TransactionType } from '../../types';
import { formatMoney, getFrequencyLabel } from '../../utils/formatters';

interface RecurringModalProps { onClose: () => void; }

const emptyForm = () => ({
  name: '',
  type: 'expense' as TransactionType,
  amount: '',
  categoryId: '',
  accountId: '',
  frequency: 'monthly' as RecurringFrequency,
  startDate: format(new Date(), 'yyyy-MM-dd'),
});

export const RecurringModal = ({ onClose }: RecurringModalProps) => {
  const { recurringTransactions, accounts, categories, addRecurring, updateRecurring, deleteRecurring, processRecurring } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const filteredCats = categories.filter(c => c.type === (type === 'transfer' ? 'expense' : type) && !c.isArchived);

  const openCreate = () => {
    setEditingId(null);
    const d = emptyForm();
    setName(d.name); setType(d.type); setAmount(d.amount);
    setCategoryId(d.categoryId); setAccountId(accounts[0]?.id || '');
    setFrequency(d.frequency); setStartDate(d.startDate);
    setShowForm(true);
  };

  const openEdit = (id: string) => {
    const r = recurringTransactions.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setName(r.name); setType(r.type); setAmount(r.amount.toString());
    setCategoryId(r.categoryId); setAccountId(r.accountId);
    setFrequency(r.frequency); setStartDate(r.startDate);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !accountId) { toast.error('Заполните все поля'); return; }
    const data = {
      name, type, amount: parseFloat(amount),
      categoryId: categoryId || filteredCats[0]?.id || '',
      accountId, frequency,
    };

    if (editingId) {
      updateRecurring(editingId, data);
      toast.success('Регулярная транзакция обновлена');
    } else {
      addRecurring({ ...data, startDate, nextDate: startDate, isActive: true });
      toast.success('Регулярная транзакция добавлена');
    }
    closeForm();
  };

  const handleProcess = () => {
    processRecurring();
    toast.success('Расписание обновлено');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-card border border-bg-border rounded-2xl shadow-card animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-bg-border sticky top-0 bg-bg-card rounded-t-2xl">
          <h2 className="text-text-primary font-semibold">Регулярные транзакции</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleProcess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/15 text-brand text-xs font-medium hover:bg-brand/25 transition-colors">
              <RefreshCw size={13} /> Обновить
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* List */}
          {recurringTransactions.map(r => {
            const cat = categories.find(c => c.id === r.categoryId);
            const acc = accounts.find(a => a.id === r.accountId);
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary border border-bg-border">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: (cat?.color || '#6b7280') + '20', color: cat?.color }}>
                  <span className="text-xs font-bold">{r.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{r.name}</p>
                  <p className="text-text-muted text-xs">{getFrequencyLabel(r.frequency)} · {acc?.name}</p>
                  <p className="text-text-muted text-xs">Следующая: {r.nextDate}</p>
                </div>
                <span className={clsx('font-mono font-semibold text-sm flex-shrink-0',
                  r.type === 'income' ? 'text-income' : 'text-expense')}>
                  {r.type === 'income' ? '+' : '-'}{formatMoney(r.amount, 'RUB', true)}
                </span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => updateRecurring(r.id, { isActive: !r.isActive })}
                    className={clsx('p-1.5 rounded-lg transition-colors',
                      r.isActive ? 'text-income hover:bg-income/10' : 'text-text-muted hover:bg-bg-hover')}>
                    {r.isActive ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                  <button onClick={() => openEdit(r.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(r.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {recurringTransactions.length === 0 && !showForm && (
            <p className="text-text-muted text-sm text-center py-4">Нет регулярных транзакций</p>
          )}

          {/* Form */}
          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-bg-secondary rounded-xl border border-bg-border">
              <p className="text-text-primary text-sm font-medium">
                {editingId ? 'Редактировать' : 'Новая регулярная транзакция'}
              </p>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Название"
                className="w-full bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm
                  focus:outline-none focus:border-brand" />
              <div className="grid grid-cols-2 gap-2">
                <select value={type} onChange={e => { setType(e.target.value as TransactionType); setCategoryId(''); }}
                  className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand">
                  <option value="expense">Расход</option>
                  <option value="income">Доход</option>
                </select>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="Сумма" min="0" step="0.01"
                  className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm
                    focus:outline-none focus:border-brand" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand">
                  <option value="">Категория</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={accountId} onChange={e => setAccountId(e.target.value)}
                  className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={frequency} onChange={e => setFrequency(e.target.value as RecurringFrequency)}
                  className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand">
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                  <option value="quarterly">Ежеквартально</option>
                  <option value="yearly">Ежегодно</option>
                </select>
                {!editingId && (
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand" />
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all flex items-center justify-center gap-1.5">
                  <Check size={14} />
                  {editingId ? 'Сохранить' : 'Добавить'}
                </button>
                <button type="button" onClick={closeForm}
                  className="px-4 py-2.5 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary text-sm transition-all">
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button onClick={openCreate}
              className="w-full py-3 rounded-xl border border-dashed border-bg-border text-text-muted text-sm
                hover:border-brand/50 hover:text-brand transition-all flex items-center justify-center gap-2">
              <Plus size={15} /> Добавить регулярную транзакцию
            </button>
          )}
        </div>
      </div>
      {confirmDeleteId && (() => {
        const r = recurringTransactions.find(x => x.id === confirmDeleteId);
        return (
          <ConfirmDialog
            title={`Удалить «${r?.name}»?`}
            onConfirm={() => { deleteRecurring(confirmDeleteId); toast.success('Удалено'); setConfirmDeleteId(null); }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
    </div>
  );
};
