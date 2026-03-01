import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Clock, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatMoney, formatDateShort } from '../../utils/formatters';
import { TransactionType } from '../../types';

interface SearchModalProps {
  onClose: () => void;
}

export const SearchModal = ({ onClose }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'' | TransactionType>('');
  const [filterAmtMin, setFilterAmtMin] = useState('');
  const [filterAmtMax, setFilterAmtMax] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { transactions, categories, accounts } = useFinanceStore();

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasFilters = filterType || filterAmtMin || filterAmtMax || filterDateFrom || filterDateTo || filterTag;

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 1 && !hasFilters) return [];

    return transactions
      .filter(tx => {
        const cat = catMap[tx.categoryId];
        if (q && !(
          tx.comment?.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q) ||
          tx.amount.toString().includes(q) ||
          accMap[tx.accountId]?.name.toLowerCase().includes(q)
        )) return false;

        if (filterType && tx.type !== filterType) return false;
        if (filterAmtMin && tx.amount < parseFloat(filterAmtMin)) return false;
        if (filterAmtMax && tx.amount > parseFloat(filterAmtMax)) return false;
        if (filterDateFrom && tx.date < filterDateFrom) return false;
        if (filterDateTo && tx.date > filterDateTo) return false;
        if (filterTag && !tx.tags?.includes(filterTag.toLowerCase())) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
  }, [query, transactions, filterType, filterAmtMin, filterAmtMax, filterDateFrom, filterDateTo, filterTag]);

  const handleGoToTransactions = () => {
    navigate('/transactions');
    onClose();
  };

  const resetFilters = () => {
    setFilterType('');
    setFilterAmtMin('');
    setFilterAmtMax('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTag('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-bg-card border border-bg-border rounded-2xl shadow-card animate-slide-up overflow-hidden">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-bg-border">
          <Search size={18} className="text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск транзакций, категорий, сумм..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm outline-none"
          />
          <button
            onClick={() => setShowFilters(p => !p)}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              showFilters || hasFilters
                ? 'text-brand bg-brand/10'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            )}
            title="Фильтры"
          >
            <SlidersHorizontal size={15} />
          </button>
          {(query || hasFilters) && (
            <button onClick={() => { setQuery(''); resetFilters(); }} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-bg-border text-text-muted text-xs font-mono ml-1">Esc</kbd>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-bg-border bg-bg-secondary space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted text-xs mb-1">Тип</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
                  className="w-full bg-bg-card border border-bg-border rounded-xl px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-brand">
                  <option value="">Все</option>
                  <option value="income">Доход</option>
                  <option value="expense">Расход</option>
                  <option value="transfer">Перевод</option>
                </select>
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1">Тег</label>
                <input value={filterTag} onChange={e => setFilterTag(e.target.value)}
                  placeholder="название тега"
                  className="w-full bg-bg-card border border-bg-border rounded-xl px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-brand placeholder-text-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted text-xs mb-1">Сумма от</label>
                <input type="number" value={filterAmtMin} onChange={e => setFilterAmtMin(e.target.value)}
                  placeholder="0"
                  className="w-full bg-bg-card border border-bg-border rounded-xl px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-brand placeholder-text-muted" />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1">Сумма до</label>
                <input type="number" value={filterAmtMax} onChange={e => setFilterAmtMax(e.target.value)}
                  placeholder="∞"
                  className="w-full bg-bg-card border border-bg-border rounded-xl px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-brand placeholder-text-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted text-xs mb-1">Дата от</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full bg-bg-card border border-bg-border rounded-xl px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1">Дата до</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full bg-bg-card border border-bg-border rounded-xl px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-brand" />
              </div>
            </div>
            {hasFilters && (
              <button onClick={resetFilters} className="text-xs text-text-muted hover:text-expense transition-colors">
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim().length === 0 && !hasFilters && (
            <div className="px-4 py-3">
              <p className="text-text-muted text-xs mb-2 flex items-center gap-1.5">
                <Clock size={12} /> Недавние транзакции
              </p>
              {[...transactions]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map(tx => <ResultRow key={tx.id} tx={tx} catMap={catMap} accMap={accMap} onClose={onClose} />)
              }
            </div>
          )}

          {(query.trim().length > 0 || hasFilters) && results.length === 0 && (
            <div className="px-4 py-10 text-center text-text-muted text-sm">
              Ничего не найдено
            </div>
          )}

          {results.length > 0 && (
            <div className="px-2 py-2">
              <p className="text-text-muted text-xs px-2 py-1.5">
                Найдено: {results.length} {results.length === 15 ? '(показаны первые 15)' : ''}
              </p>
              {results.map(tx => <ResultRow key={tx.id} tx={tx} catMap={catMap} accMap={accMap} onClose={onClose} />)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-bg-border flex items-center justify-between">
          <div className="flex gap-3 text-xs text-text-muted">
            <span><kbd className="font-mono bg-bg-border px-1 rounded">↑↓</kbd> навигация</span>
            <span><kbd className="font-mono bg-bg-border px-1 rounded">Enter</kbd> открыть</span>
          </div>
          {(query || hasFilters) && results.length > 0 && (
            <button onClick={handleGoToTransactions} className="text-brand text-xs hover:underline">
              Все результаты →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultRow = ({ tx, catMap, accMap, onClose }: {
  tx: any; catMap: any; accMap: any; onClose: () => void;
}) => {
  const navigate = useNavigate();
  const cat = catMap[tx.categoryId];
  const acc = accMap[tx.accountId];

  const handleClick = () => {
    navigate('/transactions');
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-bg-hover transition-colors group text-left"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: (cat?.color || '#6b7280') + '20', color: cat?.color || '#6b7280' }}>
        <span className="text-sm font-bold">{cat?.name?.[0] || '?'}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">
          {tx.comment || cat?.name || '—'}
        </p>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{cat?.name}</span>
          {acc && <><span>·</span><span>{acc.name}</span></>}
          <span>·</span>
          <span>{formatDateShort(tx.date)}</span>
          {tx.tags?.length > 0 && (
            <span className="text-brand">#{tx.tags[0]}{tx.tags.length > 1 ? ` +${tx.tags.length - 1}` : ''}</span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        {tx.type === 'income'
          ? <ArrowUpRight size={14} className="text-income" />
          : tx.type === 'expense'
            ? <ArrowDownRight size={14} className="text-expense" />
            : <ArrowLeftRight size={14} className="text-brand" />
        }
      </div>

      <span className={clsx('font-mono font-semibold text-sm flex-shrink-0',
        tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-brand')}>
        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
        {formatMoney(tx.amount)}
      </span>
    </button>
  );
};
