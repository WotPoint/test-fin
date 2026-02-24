import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'dark' | 'light';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  if (mode === 'dark') html.classList.add('dark');
  if (mode === 'light') html.classList.add('light');
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
      },
      toggle: () => {
        const order: ThemeMode[] = ['system', 'dark', 'light'];
        const next = order[(order.indexOf(get().mode) + 1) % order.length];
        set({ mode: next });
        applyTheme(next);
      },
    }),
    { name: 'fintrack-theme' }
  )
);

// Call once on app init to restore saved theme
export function initTheme() {
  const stored = localStorage.getItem('fintrack-theme');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      applyTheme(parsed?.state?.mode ?? 'system');
    } catch {
      applyTheme('system');
    }
  }
}
