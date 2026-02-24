import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Удалить',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmDialogProps) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative w-full max-w-sm bg-bg-card border border-bg-border rounded-2xl shadow-card-lg animate-slide-up p-6">
      <div className={clsx(
        'w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4',
        danger ? 'bg-expense/15' : 'bg-warning/15'
      )}>
        <AlertTriangle size={22} className={danger ? 'text-expense' : 'text-warning'} />
      </div>
      <h3 className="text-text-primary font-semibold text-center mb-2">{title}</h3>
      {message && <p className="text-text-secondary text-sm text-center mb-6">{message}</p>}
      {!message && <div className="mb-6" />}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm font-medium transition-all"
        >
          Отмена
        </button>
        <button
          onClick={() => { onConfirm(); onCancel(); }}
          className={clsx(
            'flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all',
            danger ? 'bg-expense hover:bg-expense/90' : 'bg-warning hover:bg-warning/90'
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
