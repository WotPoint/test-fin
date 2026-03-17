import { useState, KeyboardEvent } from 'react';
import { X, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { TransactionType } from '../../types';

// Safe arithmetic formula evaluator (no eval)
// Supports: + - * / and parentheses, spaces ignored
const evalFormula = (expr: string): number | null => {
  const str = expr.replace(/\s/g, '').replace(/,/g, '.');
  if (!/^[\d.+\-*/()]+$/.test(str)) return null;
  try {
    const tokens = str.match(/\d+\.?\d*|[+\-*/()]/g);
    if (!tokens) return null;

    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    const parseExpr = (): number => {
      let left = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };
    const parseTerm = (): number => {
      let left = parseFactor();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const right = parseFactor();
        if (op === '/' && right === 0) throw new Error('div0');
        left = op === '*' ? left * right : left / right;
      }
      return left;
    };
    const parseFactor = (): number => {
      if (peek() === '(') {
        consume();
        const val = parseExpr();
        consume(); // ')'
        return val;
      }
      if (peek() === '-') { consume(); return -parseFactor(); }
      const n = parseFloat(consume());
      if (isNaN(n)) throw new Error('nan');
      return n;
    };

    const result = parseExpr();
    return isFinite(result) && result > 0 ? Math.round(result * 100) / 100 : null;
  } catch {
    return null;
  }
};

const isFormula = (s: string) => /[+\-*/()]/.test(s);

interface TransactionModalProps {
  onClose: () => void;
  editId?: string;
  initialDate?: string;
}

export const TransactionModal = ({ onClose, editId, initialDate }: TransactionModalProps) => {
  const { transactions, accounts, categories, subcategories, addTransaction, updateTransaction } = useFinanceStore();

  const editing = editId ? transactions.find(t => t.id === editId) : undefined;

  const [type, setType] = useState<TransactionType>(editing?.type || 'expense');
  const [amount, setAmount] = useState(editing?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState(editing?.subcategoryId || '');
  const [accountId, setAccountId] = useState(
    editing?.accountId ||
    accounts.find(a => !a.isArchived && a.type === 'card')?.id ||
    accounts.find(a => !a.isArchived)?.id ||
    ''
  );
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId || '');
  const [date, setDate] = useState(editing?.date || initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [comment, setComment] = useState(editing?.comment || '');
  const [tags, setTags] = useState<string[]>(editing?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCats = categories.filter(c => c.type === (type === 'transfer' ? 'expense' : type) && !c.isArchived);
  const filteredSubs = subcategories.filter(s => s.categoryId === categoryId);
  const activeAccounts = accounts.filter(a => !a.isArchived);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    if (e.key === ',') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const amt = isFormula(amount) ? evalFormula(amount) : parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Введите корректную сумму'); return; }
    if (type !== 'transfer' && !categoryId) { toast.error('Выберите категорию'); return; }
    if (!accountId) { toast.error('Выберите счёт'); return; }
    if (type === 'transfer' && !toAccountId) { toast.error('Выберите счёт назначения'); return; }

    const data = {
      type, amount: amt, categoryId: type === 'transfer' ? '' : categoryId,
      subcategoryId: subcategoryId || undefined, accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date, comment: comment || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    setIsSubmitting(true);
    try {
      if (editId) {
        await updateTransaction(editId, data);
        toast.success('Транзакция обновлена');
      } else {
        await addTransaction(data);
        toast.success(type === 'income' ? 'Доход добавлен!' : type === 'expense' ? 'Расход добавлен!' : 'Перевод выполнен!');
      }
      onClose();
    } catch {
      toast.error('Не удалось сохранить транзакцию');
    } finally {
      setIsSubmitting(false);
    }
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
                type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0 или 100+50*2" required
                className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-8 pr-4 py-3 text-text-primary font-mono text-lg
                  focus:outline-none focus:border-brand transition-colors placeholder-text-muted"
              />
            </div>
            {isFormula(amount) && (
              <p className="mt-1.5 text-xs font-mono pl-1">
                {(() => {
                  const result = evalFormula(amount);
                  return result !== null
                    ? <span className="text-brand">= {result.toLocaleString('ru-RU')} ₽</span>
                    : <span className="text-expense">Некорректная формула</span>;
                })()}
              </p>
            )}
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

          {/* Tags */}
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Теги</label>
            <div className={clsx(
              'flex flex-wrap gap-1.5 items-center bg-bg-secondary border rounded-xl px-3 py-2.5 min-h-[46px] transition-colors',
              'border-bg-border focus-within:border-brand'
            )}>
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/15 text-brand text-xs font-medium">
                  <Tag size={10} />
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:text-expense transition-colors leading-none">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder={tags.length === 0 ? 'Тег + Enter...' : ''}
                className="flex-1 min-w-20 bg-transparent text-text-primary text-sm focus:outline-none placeholder-text-muted"
              />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting}
            className={clsx('w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed',
              type === 'income'
                ? 'bg-income hover:bg-income/90 text-white'
                : type === 'expense'
                  ? 'bg-expense hover:bg-expense/90 text-white'
                  : 'bg-brand hover:bg-brand-light text-bg-primary')}>
            {isSubmitting ? 'Сохранение...' : editId ? 'Сохранить' : type === 'income' ? 'Добавить доход' : type === 'expense' ? 'Добавить расход' : 'Выполнить перевод'}
          </button>
        </form>
      </div>
    </div>
  );
};
