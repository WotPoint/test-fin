import { useState, FormEvent } from 'react';
import { Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onLogin: () => void;
}

export const LoginPage = ({ onLogin }: Props) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка входа');
        return;
      }
      localStorage.setItem('fintrack_token', data.token);
      onLogin();
    } catch {
      toast.error('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand/15 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-brand" />
          </div>
          <h1 className="text-text-primary text-2xl font-bold">FinTrack</h1>
          <p className="text-text-secondary text-sm mt-1">Личный финансовый трекер</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}
          className="bg-bg-card border border-bg-border rounded-2xl p-6 space-y-4 shadow-card">
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Имя пользователя</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Введите логин"
                autoComplete="username"
                required
                className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-9 pr-4 py-3
                  text-text-primary focus:outline-none focus:border-brand transition-colors text-sm placeholder-text-muted"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Пароль</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Введите пароль"
                autoComplete="current-password"
                required
                className="w-full bg-bg-secondary border border-bg-border rounded-xl pl-9 pr-4 py-3
                  text-text-primary focus:outline-none focus:border-brand transition-colors text-sm placeholder-text-muted"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand text-bg-primary font-semibold text-sm
              hover:bg-brand-light transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};
