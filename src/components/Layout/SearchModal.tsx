import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatMoney, formatDateShort } from '../../utils/formatters';

interface SearchModalProps {
  onClose: () => void;
}

export const SearchModal = ({ onClose }: SearchModalProps) => {
  const [query, setQuery] = useState('');
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

  const results = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase();
    return transactions
      .filter(tx => {
        const cat = catMap[tx.categoryId];
        return (
          tx.comment?.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q) ||
          tx.amount.toString().includes(q) ||
          accMap[tx.accountId]?.name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [query, transactions]);

  const handleGoToTransactions = () => {
    navigate('/transactions');
    onClose();
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
          {query && (
            <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-bg-border text-text-muted text-xs font-mono ml-1">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim().length === 0 && (
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

          {query.trim().length > 0 && results.length === 0 && (
            <div className="px-4 py-10 text-center text-text-muted text-sm">
              Ничего не найдено по запросу «{query}»
            </div>
          )}

          {results.length > 0 && (
            <div className="px-2 py-2">
              <p className="text-text-muted text-xs px-2 py-1.5">
                Найдено: {results.length} {results.length === 12 ? '(показаны первые 12)' : ''}
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
          {query && results.length > 0 && (
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
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: (cat?.color || '#6b7280') + '20', color: cat?.color || '#6b7280' }}>
        <span className="text-sm font-bold">{cat?.name?.[0] || '?'}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">
          {tx.comment || cat?.name || '—'}
        </p>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{cat?.name}</span>
          {acc && <><span>·</span><span>{acc.name}</span></>}
          <span>·</span>
          <span>{formatDateShort(tx.date)}</span>
        </div>
      </div>

      {/* Type icon */}
      <div className="flex-shrink-0">
        {tx.type === 'income'
          ? <ArrowUpRight size={14} className="text-income" />
          : tx.type === 'expense'
            ? <ArrowDownRight size={14} className="text-expense" />
            : <ArrowLeftRight size={14} className="text-brand" />
        }
      </div>

      {/* Amount */}
      <span className={clsx('font-mono font-semibold text-sm flex-shrink-0',
        tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-brand')}>
        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
        {formatMoney(tx.amount)}
      </span>
    </button>
  );
};
