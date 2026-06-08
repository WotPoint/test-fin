import { useState, useRef, FormEvent } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

export const BankImportModal = ({ onClose }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { importBankStatement } = useFinanceStore();

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Поддерживаются только файлы .xlsx и .xls');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const res = await importBankStatement(file);
      setResult(res);
      toast.success(`Импорт завершён: добавлено ${res.created}, пропущено ${res.skipped}`);
    } catch (e) {
      // error already toasted by store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-card border border-bg-border rounded-2xl w-full max-w-md shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border">
          <h2 className="text-text-primary font-semibold text-base">Импорт выписки Альфа-Банка</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {result ? (
            <div className="space-y-4 text-center">
              <CheckCircle size={48} className="mx-auto text-income" />
              <div>
                <p className="text-text-primary font-medium text-lg">Импорт завершён</p>
                <p className="text-text-secondary text-sm mt-1">
                  Добавлено транзакций: <span className="text-income font-semibold">{result.created}</span>
                </p>
                <p className="text-text-secondary text-sm">
                  Пропущено (дубли): <span className="text-text-muted font-semibold">{result.skipped}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all"
              >
                Закрыть
              </button>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
                  ${dragOver ? 'border-brand bg-brand/5' : 'border-bg-border bg-bg-secondary hover:border-brand/50'}
                `}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
                {file ? (
                  <>
                    <FileSpreadsheet size={32} className="text-brand" />
                    <div className="text-center">
                      <p className="text-text-primary text-sm font-medium">{file.name}</p>
                      <p className="text-text-muted text-xs">{(file.size / 1024).toFixed(1)} КБ</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-text-muted" />
                    <div className="text-center">
                      <p className="text-text-secondary text-sm font-medium">Перетащите файл или нажмите для выбора</p>
                      <p className="text-text-muted text-xs mt-1">Поддерживаются .xlsx и .xls выписки Альфа-Банка</p>
                    </div>
                  </>
                )}
              </div>

              {file && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                      Импорт...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Импортировать
                    </>
                  )}
                </button>
              )}

              <div className="flex items-start gap-2 text-text-muted text-xs">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p>
                  Импорт производится в первый доступный счёт. Операции с одинаковым кодом не дублируются.
                  Категории маппятся автоматически (при несовпадении остаются без категории).
                </p>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
