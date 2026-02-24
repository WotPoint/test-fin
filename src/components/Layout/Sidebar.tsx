import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Target,
  BarChart3, CalendarDays, FileText, ChevronRight, TrendingUp,
  Sun, Moon, Monitor, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useThemeStore, ThemeMode } from '../../store/useThemeStore';
import { formatMoney } from '../../utils/formatters';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Транзакции' },
  { to: '/accounts',     icon: Wallet,          label: 'Счета' },
  { to: '/budgets',      icon: PieChart,        label: 'Бюджеты' },
  { to: '/goals',        icon: Target,          label: 'Цели' },
  { to: '/analytics',    icon: BarChart3,       label: 'Аналитика' },
  { to: '/calendar',     icon: CalendarDays,    label: 'Календарь' },
  { to: '/reports',      icon: FileText,        label: 'Отчёты' },
];

const themeConfig: Record<ThemeMode, { icon: React.ElementType; label: string; next: string }> = {
  system: { icon: Monitor, label: 'Авто',    next: 'Тёмная' },
  dark:   { icon: Moon,    label: 'Тёмная',  next: 'Светлая' },
  light:  { icon: Sun,     label: 'Светлая', next: 'Авто' },
};

export const Sidebar = ({ mobileOpen = false, onMobileClose }: SidebarProps) => {
  const getTotalBalance = useFinanceStore(s => s.getTotalBalance);
  const total = getTotalBalance();
  const { mode, toggle } = useThemeStore();
  const { icon: ThemeIcon, label: themeLabel } = themeConfig[mode];

  const sidebarContent = (
    <aside className="w-64 h-full bg-bg-secondary border-r border-bg-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-bg-border flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="text-text-primary font-bold text-lg tracking-tight">FinTrack</span>
        </div>
        {onMobileClose && (
          <button onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mx-4 mt-4 p-4 rounded-xl bg-brand/10 border border-brand/20">
        <p className="text-text-secondary text-xs font-medium mb-1">Общий баланс</p>
        <p className="text-text-primary text-xl font-bold font-mono">{formatMoney(total)}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-brand/15 text-brand'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={clsx(isActive ? 'text-brand' : 'text-text-muted group-hover:text-text-secondary')} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-brand" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-bg-border space-y-2 flex-shrink-0">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all text-sm"
        >
          <ThemeIcon size={16} className="text-brand flex-shrink-0" />
          <span className="flex-1 text-left">{themeLabel}</span>
          <span className="text-text-muted text-xs">{themeConfig[mode].next} →</span>
        </button>
        <p className="text-text-muted text-xs text-center">FinTrack v1.0</p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile: overlay drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative h-full animate-slide-up" style={{ animationDuration: '0.2s' }}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
