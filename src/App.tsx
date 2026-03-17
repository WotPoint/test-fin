import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Transactions } from './pages/Transactions/Transactions';
import { Accounts } from './pages/Accounts/Accounts';
import { Budgets } from './pages/Budgets/Budgets';
import { Goals } from './pages/Goals/Goals';
import { Analytics } from './pages/Analytics/Analytics';
import { Calendar } from './pages/Calendar/Calendar';
import { Reports } from './pages/Reports/Reports';
import { useFinanceStore } from './store/useFinanceStore';
import { useThemeStore } from './store/useThemeStore';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { LoginPage } from './pages/Auth/LoginPage';

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
  const { loadData, processRecurring, isLoading } = useFinanceStore();
  const { mode, setMode } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMode(mode);
    loadData().then(() => processRecurring());
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Загрузка данных...</p>
        </div>
      </div>
    );
  }

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
  const [isAuthed, setIsAuthed] = useState(() => !!localStorage.getItem('fintrack_token'));

  useEffect(() => {
    const handler = () => setIsAuthed(false);
    window.addEventListener('fintrack:auth-expired', handler);
    return () => window.removeEventListener('fintrack:auth-expired', handler);
  }, []);

  if (!isAuthed) {
    return (
      <ErrorBoundary>
        <Toaster position="bottom-right" />
        <LoginPage onLogin={() => setIsAuthed(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
