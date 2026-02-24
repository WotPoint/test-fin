import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Transactions } from './components/Transactions/Transactions';
import { Accounts } from './components/Accounts/Accounts';
import { Budgets } from './components/Budgets/Budgets';
import { Goals } from './components/Goals/Goals';
import { Analytics } from './components/Analytics/Analytics';
import { Calendar } from './components/Calendar/Calendar';
import { Reports } from './components/Reports/Reports';
import { useFinanceStore } from './store/useFinanceStore';
import { useThemeStore } from './store/useThemeStore';

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/':             { title: 'Дашборд',              subtitle: 'Обзор финансов' },
  '/transactions': { title: 'Транзакции',            subtitle: 'История операций' },
  '/accounts':     { title: 'Счета',                 subtitle: 'Управление счетами' },
  '/budgets':      { title: 'Бюджеты и категории',   subtitle: 'Контроль расходов' },
  '/goals':        { title: 'Финансовые цели',       subtitle: 'Накопления и планы' },
  '/analytics':    { title: 'Аналитика',             subtitle: 'Графики и статистика' },
  '/calendar':     { title: 'Календарь',             subtitle: 'Финансовый план' },
  '/reports':      { title: 'Отчёты',                subtitle: 'Экспорт и отчёты' },
};

const AppContent = () => {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'FinTrack' };
  const { processRecurring } = useFinanceStore();
  const { mode, setMode } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    processRecurring();
    setMode(mode);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={meta.title} subtitle={meta.subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts"     element={<Accounts />} />
            <Route path="/budgets"      element={<Budgets />} />
            <Route path="/goals"        element={<Goals />} />
            <Route path="/analytics"    element={<Analytics />} />
            <Route path="/calendar"     element={<Calendar />} />
            <Route path="/reports"      element={<Reports />} />
          </Routes>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--bg-border)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: 'rgb(var(--income-rgb))', secondary: 'var(--bg-card)' } },
          error:   { iconTheme: { primary: 'rgb(var(--expense-rgb))', secondary: 'var(--bg-card)' } },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
