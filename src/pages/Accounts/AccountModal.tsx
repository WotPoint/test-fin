import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { Account, AccountType, Currency } from '../../types';

interface AccountModalProps {
  onClose: () => void;
  account?: Account;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const ICONS = ['Banknote', 'CreditCard', 'Wallet', 'PiggyBank', 'TrendingUp'];
const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR', 'GBP', 'CNY'];
const TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Банковская карта' },
  { value: 'ewallet', label: 'Электронный кошелёк' },
  { value: 'savings', label: 'Накопительный счёт' },
  { value: 'investment', label: 'Инвестиции' },
];

export const AccountModal = ({ onClose, account }: AccountModalProps) => {
  const { addAccount, updateAccount } = useFinanceStore();
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<AccountType>(account?.type || 'card');
  const [currency, setCurrency] = useState<Currency>(account?.currency || 'RUB');
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance?.toString() || '0');
  const [color, setColor] = useState(account?.color || COLORS[0]);
  const [icon, setIcon] = useState(account?.icon || ICONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Введите название счёта'); return; }
    const data = { name: name.trim(), type, currency, initialBalance: parseFloat(initialBalance) || 0, color, icon, isArchived: account?.isArchived || false };
    if (account) {
      updateAccount(account.id, data);
      toast.success('Счёт обновлён');
    } else {
      addAccount(data);
      toast.success('Счёт создан');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border border-bg-border rounded-2xl shadow-card animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="text-text-primary font-semibold">{account ? 'Редактировать счёт' : 'Новый счёт'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Карта Сбербанка"
              className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary text-sm
                focus:outline-none focus:border-brand placeholder-text-muted" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary text-xs mb-1.5">Тип счёта</label>
              <select value={type} onChange={e => setType(e.target.value as AccountType)}
                className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary text-sm
                  focus:outline-none focus:border-brand">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1.5">Валюта</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full bg-bg-secondary border border-bg-border rounded-xl px-3 py-3 text-text-primary text-sm
                  focus:outline-none focus:border-brand">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Начальный баланс</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-mono">₽</span>
              <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
                className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-8 pr-4 py-3 text-text-primary font-mono
                  focus:outline-none focus:border-brand" />
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

          <div>
            <label className="block text-text-secondary text-xs mb-2">Иконка</label>
            <div className="flex gap-2">
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    icon === ic ? 'bg-brand text-bg-primary' : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-bg-border')}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full py-3.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all">
            {account ? 'Сохранить' : 'Создать счёт'}
          </button>
        </form>
      </div>
    </div>
  );
};
