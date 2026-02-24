import { useState, useEffect } from 'react';
import { Plus, Bell, Search, Menu } from 'lucide-react';
import { TransactionModal } from '../Transactions/TransactionModal';
import { SearchModal } from './SearchModal';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export const Header = ({ title, subtitle, onMenuClick }: HeaderProps) => {
  const [showModal, setShowModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-bg-border bg-bg-secondary/80 backdrop-blur flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-text-primary font-semibold text-lg leading-tight">{title}</h1>
            {subtitle && <p className="text-text-secondary text-xs hidden sm:block">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-hover border border-bg-border text-text-secondary hover:text-text-primary hover:border-brand/40 transition-all"
          >
            <Search size={15} />
            <span className="text-xs hidden sm:block">Поиск</span>
            <kbd className="hidden lg:block px-1.5 py-0.5 rounded bg-bg-border text-text-muted text-xs font-mono">
              Ctrl K
            </kbd>
          </button>
          <button className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-colors ml-1"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Добавить</span>
          </button>
        </div>
      </header>

      {/* FAB — mobile only */}
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-brand text-bg-primary shadow-glow flex items-center justify-center hover:bg-brand-light transition-all active:scale-95"
      >
        <Plus size={24} />
      </button>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </>
  );
};
