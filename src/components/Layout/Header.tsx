import { useState } from 'react';
import { Plus, Bell, Search } from 'lucide-react';
import { TransactionModal } from '../Transactions/TransactionModal';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header = ({ title, subtitle }: HeaderProps) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-bg-border bg-bg-secondary/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
        <div>
          <h1 className="text-text-primary font-semibold text-lg leading-tight">{title}</h1>
          {subtitle && <p className="text-text-secondary text-xs">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
            <Search size={18} />
          </button>
          <button className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-bg-primary font-semibold text-sm hover:bg-brand-light transition-colors ml-2"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>
      </header>
      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </>
  );
};
