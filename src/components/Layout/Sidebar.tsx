import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Target,
  BarChart3, CalendarDays, FileText, ChevronRight, TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatMoney } from '../../utils/formatters';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Транзакции' },
  { to: '/accounts', icon: Wallet, label: 'Счета' },
  { to: '/budgets', icon: PieChart, label: 'Бюджеты' },
  { to: '/goals', icon: Target, label: 'Цели' },
  { to: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { to: '/calendar', icon: CalendarDays, label: 'Календарь' },
  { to: '/reports', icon: FileText, label: 'Отчёты' },
];

export const Sidebar = () => {
  const getTotalBalance = useFinanceStore(s => s.getTotalBalance);
  const total = getTotalBalance();

  return (
    <aside className="w-64 min-h-screen bg-bg-secondary border-r border-bg-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <TrendingUp size={16} className="text-bg-primary" />
          </div>
          <span className="text-text-primary font-bold text-lg tracking-tight">FinTrack</span>
        </div>
      </div>

      {/* Balance pill */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20">
        <p className="text-text-secondary text-xs font-medium mb-1">Общий баланс</p>
        <p className="text-text-primary text-xl font-bold font-mono">{formatMoney(total)}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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

      {/* Footer */}
      <div className="p-4 border-t border-bg-border">
        <p className="text-text-muted text-xs text-center">FinTrack v1.0</p>
      </div>
    </aside>
  );
};
