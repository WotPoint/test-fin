import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, ArrowUpDown, Repeat, CheckSquare, Square, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useFinanceStore } from '../../store/useFinanceStore';
import { TransactionModal } from './TransactionModal';
import { RecurringModal } from './RecurringModal';
import { formatMoney, formatDate } from '../../utils/formatters';
import { TransactionType } from '../../types';

type SortKey = 'date' | 'amount' | 'category';

// Parse smart search query
// Supports: >1000, <500, 500-1000, #tag, free text
const parseSmartSearch = (q: string) => {
  const tags: string[] = [];
  const parts: string[] = [];
  let minAmt: number | null = null;
  let maxAmt: number | null = null;

  q.split(/\s+/).forEach(token => {
    if (token.startsWith('#') && token.length > 1) {
      tags.push(token.slice(1).toLowerCase());
    } else if (/^>(\d+(?:\.\d+)?)$/.test(token)) {
      minAmt = parseFloat(token.slice(1));
    } else if (/^<(\d+(?:\.\d+)?)$/.test(token)) {
      maxAmt = parseFloat(token.slice(1));
    } else if (/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.test(token)) {
      const [, a, b] = token.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/)!;
      minAmt = parseFloat(a);
      maxAmt = parseFloat(b);
    } else if (token.length > 0) {
      parts.push(token.toLowerCase());
    }
  });

  return { textQuery: parts.join(' '), tags, minAmt, maxAmt };
};

export const Transactions = () => {
  const { transactions, transactionsTotal, categories, accounts, deleteTransaction, loadMoreTransactions } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'' | TransactionType>('');
  const [filterCat, setFilterCat] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const PER_PAGE = 25;

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  const parsed = useMemo(() => parseSmartSearch(search), [search]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    const { textQuery, tags, minAmt, maxAmt } = parsed;

    if (textQuery) list = list.filter(t =>
      t.comment?.toLowerCase().includes(textQuery) ||
      catMap[t.categoryId]?.name.toLowerCase().includes(textQuery)
    );
    if (tags.length > 0) list = list.filter(t => tags.every(tag => t.tags?.includes(tag)));
    if (minAmt !== null) list = list.filter(t => t.amount >= minAmt!);
    if (maxAmt !== null) list = list.filter(t => t.amount <= maxAmt!);
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
  }, [transactions, categories, parsed, filterType, filterCat, filterAccount, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (safePage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  })();

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    toast.success('Транзакция удалена');
    setConfirmDeleteId(null);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteTransaction(id));
    toast.success(`Удалено ${selectedIds.size} транзакций`);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pagedIds = paged.map(t => t.id);
  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selectedIds.has(id));
  const somePageSelected = pagedIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof paged> = {};
    paged.forEach(tx => {
      const d = tx.date;
      if (!groups[d]) groups[d] = [];
      groups[d].push(tx);
    });
    return Object.entries(groups)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([date, txs]) => [date, [...txs].sort((a, b) => b.amount - a.amount)] as const);
  }, [paged]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const hasSmartTokens = parsed.tags.length > 0 || parsed.minAmt !== null || parsed.maxAmt !== null;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder='Поиск... >1000, <500, #тег'
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

      {/* Smart search hints */}
      {hasSmartTokens && (
        <div className="flex flex-wrap gap-2">
          {parsed.minAmt !== null && parsed.maxAmt !== null && (
            <span className="px-2 py-1 bg-brand/10 text-brand text-xs rounded-full">
              Сумма: {parsed.minAmt}–{parsed.maxAmt} ₽
            </span>
          )}
          {parsed.minAmt !== null && parsed.maxAmt === null && (
            <span className="px-2 py-1 bg-brand/10 text-brand text-xs rounded-full">
              Сумма: от {parsed.minAmt} ₽
            </span>
          )}
          {parsed.maxAmt !== null && parsed.minAmt === null && (
            <span className="px-2 py-1 bg-brand/10 text-brand text-xs rounded-full">
              Сумма: до {parsed.maxAmt} ₽
            </span>
          )}
          {parsed.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-brand/10 text-brand text-xs rounded-full">#{tag}</span>
          ))}
        </div>
      )}

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-expense/10 border border-expense/20 rounded-xl">
          <CheckSquare size={16} className="text-expense" />
          <span className="text-text-primary text-sm font-medium flex-1">
            Выбрано: {selectedIds.size}
          </span>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-expense text-white text-xs font-medium hover:bg-expense/90 transition-colors"
          >
            <Trash2 size={13} />
            Удалить ({selectedIds.size})
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      )}

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

      {/* Select all row */}
      {paged.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-text-muted hover:text-text-secondary text-xs transition-colors">
            {allPageSelected
              ? <CheckSquare size={15} className="text-brand" />
              : somePageSelected
                ? <CheckSquare size={15} className="text-brand/50" />
                : <Square size={15} />
            }
            {allPageSelected ? 'Снять выбор' : 'Выбрать все на странице'}
          </button>
        </div>
      )}

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
                const isSelected = selectedIds.has(tx.id);
                return (
                  <div key={tx.id} className={clsx(
                    'flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors group',
                    i < txs.length - 1 && 'border-b border-bg-border',
                    isSelected && 'bg-brand/5'
                  )}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(tx.id)}
                      className="flex-shrink-0 text-text-muted hover:text-brand transition-colors"
                    >
                      {isSelected
                        ? <CheckSquare size={16} className="text-brand" />
                        : <Square size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </button>

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
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5 flex-wrap">
                        <span>{cat?.name}</span>
                        {acc && <><span>•</span><span>{acc.name}</span></>}
                        {tx.tags && tx.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                            #{tag}
                          </span>
                        ))}
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
                      <button onClick={() => setConfirmDeleteId(tx.id)}
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
        <div className="text-center py-20">
          <ArrowUpDown size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
          {transactions.length === 0 ? (
            <>
              <p className="text-text-secondary font-medium mb-2">Нет транзакций</p>
              <p className="text-text-muted text-sm mb-6">Добавьте первую транзакцию для начала отслеживания</p>
              <button onClick={() => { setEditId(undefined); setShowModal(true); }}
                className="px-6 py-3 rounded-xl bg-brand text-bg-primary font-semibold hover:bg-brand-light transition-all">
                Добавить транзакцию
              </button>
            </>
          ) : (
            <>
              <p className="text-text-secondary font-medium mb-2">Ничего не найдено</p>
              <p className="text-text-muted text-sm mb-4">Попробуйте изменить фильтры или поисковый запрос</p>
              <button onClick={() => { setSearch(''); setFilterType(''); setFilterCat(''); setFilterAccount(''); setPage(1); }}
                className="px-4 py-2 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary hover:border-brand/40 transition-all text-sm">
                Сбросить фильтры
              </button>
            </>
          )}
        </div>
      )}

      {transactions.length < transactionsTotal && (
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="text-text-muted text-sm">
            Загружено {transactions.length} из {transactionsTotal}
          </span>
          <button
            onClick={() => loadMoreTransactions()}
            className="px-4 py-2 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary hover:border-brand/50 text-sm transition-all"
          >
            Загрузить ещё 100
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-3 py-2 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          {pageNumbers.map((p, i) =>
            p === '...'
              ? <span key={`ellipsis-${i}`} className="px-2 py-2 text-text-muted text-sm">…</span>
              : <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all min-w-[36px] ${
                    safePage === p
                      ? 'bg-brand text-bg-primary'
                      : 'border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {p}
                </button>
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-3 py-2 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}

      {showModal && <TransactionModal onClose={() => { setShowModal(false); setEditId(undefined); }} editId={editId} />}
      {showRecurring && <RecurringModal onClose={() => setShowRecurring(false)} />}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Удалить транзакцию?"
          message="Это действие нельзя отменить."
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Удалить ${selectedIds.size} транзакций?`}
          message="Это действие нельзя отменить. Все выбранные транзакции будут удалены."
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
          danger
        />
      )}
    </div>
  );
};
