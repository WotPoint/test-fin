import { useState, useEffect, useRef } from 'react';
import { Plus, Bell, Search, Menu, X, AlertTriangle, Target, Clock } from 'lucide-react';
import { TransactionModal } from '../../pages/Transactions/TransactionModal';
import { SearchModal } from './SearchModal';
import { useFinanceStore, AppNotification } from '../../store/useFinanceStore';
import { clsx } from 'clsx';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const severityIcon = (s: AppNotification['severity']) => {
  if (s === 'red') return <AlertTriangle size={14} className="text-expense shrink-0" />;
  if (s === 'yellow') return <AlertTriangle size={14} className="text-warning shrink-0" />;
  return <Clock size={14} className="text-brand shrink-0" />;
};

const severityDot: Record<AppNotification['severity'], string> = {
  red: 'bg-expense',
  yellow: 'bg-warning',
  blue: 'bg-brand',
};

export const Header = ({ title, subtitle, onMenuClick }: HeaderProps) => {
  const [showModal, setShowModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { getAppNotifications } = useFinanceStore();
  const notifications = getAppNotifications();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'n' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

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

          {/* Notifications bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setShowNotifications(p => !p)}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors relative"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className={clsx(
                  'absolute top-1.5 right-1.5 w-2 h-2 rounded-full',
                  notifications.some(n => n.severity === 'red') ? 'bg-expense' : notifications.some(n => n.severity === 'yellow') ? 'bg-warning' : 'bg-brand'
                )} />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-bg-border rounded-2xl shadow-card-lg z-50 overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
                  <span className="text-text-primary font-semibold text-sm">Уведомления</span>
                  {notifications.length > 0 && (
                    <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Target size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Всё в порядке!</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-bg-border">
                    {notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors">
                        {severityIcon(n.severity)}
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-xs font-medium leading-snug">{n.title}</p>
                          <p className="text-text-muted text-xs mt-0.5">{n.message}</p>
                        </div>
                        <span className={clsx('w-1.5 h-1.5 rounded-full mt-1 shrink-0', severityDot[n.severity])} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-colors ml-1"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Добавить</span>
            <kbd className="hidden lg:block px-1.5 py-0.5 rounded bg-bg-primary/20 text-bg-primary/70 text-xs font-mono">
              N
            </kbd>
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
