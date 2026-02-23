import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, ChevronDown, ArrowUpDown, Repeat } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useFinanceStore } from '../../store/useFinanceStore';
import { TransactionModal } from './TransactionModal';
import { RecurringModal } from './RecurringModal';
import { formatMoney, formatDate } from '../../utils/formatters';
import { TransactionType } from '../../types';

type SortKey = 'date' | 'amount' | 'category';

export const Transactions = () => {
  const { transactions, categories, accounts, deleteTransaction } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'' | TransactionType>('');
  const [filterCat, setFilterCat] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (search) list = list.filter(t =>
      t.comment?.toLowerCase().includes(search.toLowerCase()) ||
      catMap[t.categoryId]?.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filterType) list = list.filter(t => t.type === filterType);
    if (filterCat) list = list.filter(t => t.categoryId === filterCat);
    if (filterAccount) list = list.filter(t => t.accountId === filterAccount);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortKey === 'amount') cmp = a.amount - b.amount;
      if (sortKey === 'category') cmp = (catMap[a.categoryId]?.name || '').localeCompare(catMap[b.categoryId]?.name || '');
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [transactions, search, filterType, filterCat, filterAccount, sortKey, sortAsc]);

  const paged = filtered.slice(0, page * PER_PAGE);
  const hasMore = filtered.length > page * PER_PAGE;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    toast.success('Транзакция удалена');
  };

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof paged> = {};
    paged.forEach(tx => {
      const d = tx.date;
      if (!groups[d]) groups[d] = [];
      groups[d].push(tx);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [paged]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по транзакциям..."
            className="w-full bg-bg-card border border-bg-border rounded-xl pl-9 pr-4 py-2.5 text-text-primary text-sm
              focus:outline-none focus:border-brand placeholder-text-muted" />
        </div>

        <select value={filterType} onChange={e => { setFilterType(e.target.value as any); setPage(1); }}
          className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand">
          <option value="">Все типы</option>
          <option value="income">Доходы</option>
          <option value="expense">Расходы</option>
          <option value="transfer">Переводы</option>
        </select>

        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
          className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand">
          <option value="">Все категории</option>
          {categories.filter(c => !c.isArchived).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
          className="bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand">
          <option value="">Все счета</option>
          {accounts.filter(a => !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <button onClick={() => setShowRecurring(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary hover:border-brand/50 text-sm transition-all">
          <Repeat size={15} />
          Регулярные
        </button>

        <button onClick={() => { setEditId(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all">
          <Plus size={16} />
          Добавить
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 text-sm">
        <span className="text-text-secondary">
          Найдено: <span className="text-text-primary font-medium">{filtered.length}</span>
        </span>
        <span className="text-income">+{formatMoney(totalIncome)}</span>
        <span className="text-expense">-{formatMoney(totalExpense)}</span>
        <span className={clsx('font-semibold', totalIncome - totalExpense >= 0 ? 'text-income' : 'text-expense')}>
          = {totalIncome - totalExpense >= 0 ? '+' : ''}{formatMoney(totalIncome - totalExpense)}
        </span>
      </div>

      {/* Transactions list grouped by date */}
      <div className="space-y-4">
        {grouped.map(([date, txs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-text-secondary text-xs font-medium">{formatDate(date)}</span>
              <div className="flex-1 h-px bg-bg-border" />
              <span className="text-text-muted text-xs">
                {txs.reduce((s, t) => t.type === 'income' ? s + t.amount : t.type === 'expense' ? s - t.amount : s, 0) >= 0 ? '+' : ''}
                {formatMoney(Math.abs(txs.reduce((s, t) => t.type === 'income' ? s + t.amount : t.type === 'expense' ? s - t.amount : s, 0)))}
              </span>
            </div>

            <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
              {txs.map((tx, i) => {
                const cat = catMap[tx.categoryId];
                const acc = accMap[tx.accountId];
                return (
                  <div key={tx.id} className={clsx('flex items-center gap-4 p-4 hover:bg-bg-hover transition-colors group',
                    i < txs.length - 1 && 'border-b border-bg-border')}>
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: (cat?.color || '#6b7280') + '20', color: cat?.color || '#6b7280' }}>
                      <span className="text-sm font-bold">{cat?.name[0] || '?'}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">
                        {tx.comment || cat?.name || 'Без категории'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        <span>{cat?.name}</span>
                        {acc && <><span>•</span><span>{acc.name}</span></>}
                        {tx.receiptPhoto && <><span>•</span><span className="text-brand">📷</span></>}
                      </div>
                    </div>

                    {/* Type badge */}
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                      tx.type === 'income' ? 'bg-income/15 text-income' :
                        tx.type === 'expense' ? 'bg-expense/15 text-expense' : 'bg-brand/15 text-brand')}>
                      {tx.type === 'income' ? 'Доход' : tx.type === 'expense' ? 'Расход' : 'Перевод'}
                    </span>

                    {/* Amount */}
                    <span className={clsx('font-mono font-bold text-base flex-shrink-0',
                      tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-brand')}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                      {formatMoney(tx.amount)}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditId(tx.id); setShowModal(true); }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <ArrowUpDown size={40} className="mx-auto mb-3 opacity-30" />
          <p>Транзакции не найдены</p>
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <button onClick={() => setPage(p => p + 1)}
            className="px-6 py-2.5 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary hover:border-brand/50 text-sm transition-all">
            Загрузить ещё ({filtered.length - paged.length})
          </button>
        </div>
      )}

      {showModal && <TransactionModal onClose={() => { setShowModal(false); setEditId(undefined); }} editId={editId} />}
      {showRecurring && <RecurringModal onClose={() => setShowRecurring(false)} />}
    </div>
  );
};
