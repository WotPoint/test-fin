import { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeftRight, Banknote, CreditCard, Wallet, PiggyBank, TrendingUp, Eye, EyeOff, SlidersHorizontal, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import toast from 'react-hot-toast';
import { useFinanceStore } from '../../store/useFinanceStore';
import { AccountModal } from './AccountModal';
import { TransactionModal } from '../Transactions/TransactionModal';
import { formatMoney } from '../../utils/formatters';
import { Account } from '../../types';

const accountIcons: Record<string, React.ElementType> = {
  Banknote, CreditCard, Wallet, PiggyBank, TrendingUp,
};

export const Accounts = () => {
  const { accounts, transactions, deleteAccount, updateAccount, getAccountBalance } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | undefined>();
  const [showTransfer, setShowTransfer] = useState(false);
  const [hiddenBalances, setHiddenBalances] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeAccounts = accounts.filter(a => !a.isArchived);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);

  const openAdjust = (accId: string, currentBalance: number) => {
    setAdjustId(accId);
    setAdjustValue(currentBalance.toFixed(2));
  };

  const handleAdjust = (acc: Account) => {
    const target = parseFloat(adjustValue);
    if (isNaN(target)) { toast.error('Введите корректную сумму'); return; }
    const current = getAccountBalance(acc.id);
    const diff = target - current;
    updateAccount(acc.id, { initialBalance: acc.initialBalance + diff });
    toast.success(`Баланс скорректирован на ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} ₽`);
    setAdjustId(null);
    setAdjustValue('');
  };

  const handleDelete = (acc: Account) => {
    const hasTx = transactions.some(t => t.accountId === acc.id);
    if (hasTx) {
      toast.error('Нельзя удалить счёт с транзакциями. Заархивируйте его.');
      setConfirmDeleteId(null);
      return;
    }
    deleteAccount(acc.id);
    toast.success('Счёт удалён');
    setConfirmDeleteId(null);
  };

  const accountTypeLabel: Record<string, string> = {
    cash: 'Наличные', card: 'Карта', ewallet: 'Кошелёк', savings: 'Накопительный', investment: 'Инвестиции',
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Total balance */}
      <div className="bg-gradient-to-br from-brand/20 via-brand/10 to-transparent border border-brand/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm mb-1">Суммарный баланс</p>
            <p className="text-text-primary text-3xl font-bold font-mono">
              {hiddenBalances ? '••••••' : formatMoney(totalBalance)}
            </p>
            <p className="text-text-muted text-xs mt-1">{activeAccounts.length} активных счёта</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setHiddenBalances(!hiddenBalances)}
              className="p-2.5 rounded-xl bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary transition-colors">
              {hiddenBalances ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button onClick={() => setShowTransfer(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary text-sm transition-all">
              <ArrowLeftRight size={15} />
              Перевод
            </button>
            <button onClick={() => { setEditAccount(undefined); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all">
              <Plus size={16} />
              Добавить
            </button>
          </div>
        </div>
      </div>

      {/* Accounts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeAccounts.map(acc => {
          const balance = getAccountBalance(acc.id);
          const Icon = accountIcons[acc.icon] || Wallet;
          const accTx = transactions.filter(t => t.accountId === acc.id);
          const income = accTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const expense = accTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

          return (
            <div key={acc.id}
              className="bg-bg-card border border-bg-border rounded-2xl p-5 hover:border-brand/30 transition-all group shadow-card">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: acc.color + '20' }}>
                    <Icon size={20} style={{ color: acc.color }} />
                  </div>
                  <div>
                    <p className="text-text-primary font-semibold">{acc.name}</p>
                    <p className="text-text-muted text-xs">{accountTypeLabel[acc.type]} · {acc.currency}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openAdjust(acc.id, getAccountBalance(acc.id))}
                    title="Скорректировать баланс"
                    className="p-1.5 rounded-lg text-text-muted hover:text-warning hover:bg-warning/10 transition-colors">
                    <SlidersHorizontal size={14} />
                  </button>
                  <button onClick={() => { setEditAccount(acc); setShowModal(true); }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(acc.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div className="mb-4">
                <p className="text-text-muted text-xs mb-0.5">Текущий баланс</p>
                {adjustId === acc.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-mono">₽</span>
                      <input
                        type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)}
                        autoFocus step="0.01"
                        className="w-full bg-bg-secondary border border-warning/50 rounded-xl pl-7 pr-3 py-2 text-text-primary font-mono text-base
                          focus:outline-none focus:border-warning transition-colors"
                      />
                    </div>
                    <button onClick={() => handleAdjust(acc)}
                      className="p-2 rounded-xl bg-income/15 text-income hover:bg-income/25 transition-colors flex-shrink-0">
                      <Check size={15} />
                    </button>
                    <button onClick={() => setAdjustId(null)}
                      className="p-2 rounded-xl bg-bg-hover text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <p className={clsx('text-2xl font-bold font-mono', balance >= 0 ? 'text-text-primary' : 'text-expense')}>
                    {hiddenBalances ? '••••••' : formatMoney(balance, acc.currency)}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-income/5 border border-income/15 rounded-xl px-3 py-2">
                  <p className="text-income text-xs font-medium">Доходы</p>
                  <p className="text-text-primary text-sm font-mono font-semibold mt-0.5">
                    {hiddenBalances ? '•••' : formatMoney(income, acc.currency, true)}
                  </p>
                </div>
                <div className="bg-expense/5 border border-expense/15 rounded-xl px-3 py-2">
                  <p className="text-expense text-xs font-medium">Расходы</p>
                  <p className="text-text-primary text-sm font-mono font-semibold mt-0.5">
                    {hiddenBalances ? '•••' : formatMoney(expense, acc.currency, true)}
                  </p>
                </div>
              </div>

              {/* Initial balance note */}
              <p className="text-text-muted text-xs mt-3 text-center">
                Начальный: {formatMoney(acc.initialBalance, acc.currency)}
              </p>
            </div>
          );
        })}

        {/* Add account card */}
        <button onClick={() => { setEditAccount(undefined); setShowModal(true); }}
          className="border border-dashed border-bg-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2
            text-text-muted hover:text-brand hover:border-brand/50 transition-all min-h-[220px]">
          <Plus size={24} />
          <span className="text-sm">Добавить счёт</span>
        </button>
      </div>

      {/* Empty state */}
      {activeAccounts.length === 0 && (
        <div className="text-center py-20">
          <Wallet size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
          <p className="text-text-secondary font-medium mb-2">Нет активных счетов</p>
          <p className="text-text-muted text-sm mb-6">Добавьте первый счёт для отслеживания финансов</p>
          <button onClick={() => { setEditAccount(undefined); setShowModal(true); }}
            className="px-6 py-3 rounded-xl bg-brand text-bg-primary font-semibold hover:bg-brand-light transition-all">
            Добавить счёт
          </button>
        </div>
      )}

      {/* Archived */}
      {accounts.filter(a => a.isArchived).length > 0 && (
        <div>
          <h3 className="text-text-secondary text-sm font-medium mb-3">Архивные счета</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {accounts.filter(a => a.isArchived).map(acc => (
              <div key={acc.id} className="bg-bg-card border border-bg-border rounded-xl p-4 opacity-50">
                <p className="text-text-secondary text-sm">{acc.name}</p>
                <p className="text-text-muted text-xs">{formatMoney(getAccountBalance(acc.id), acc.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <AccountModal onClose={() => { setShowModal(false); setEditAccount(undefined); }} account={editAccount} />
      )}
      {showTransfer && (
        <TransactionModal onClose={() => setShowTransfer(false)} />
      )}
      {confirmDeleteId && (() => {
        const acc = accounts.find(a => a.id === confirmDeleteId)!;
        return (
          <ConfirmDialog
            title={`Удалить «${acc?.name}»?`}
            message="Это действие нельзя отменить."
            onConfirm={() => handleDelete(acc)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
    </div>
  );
};
