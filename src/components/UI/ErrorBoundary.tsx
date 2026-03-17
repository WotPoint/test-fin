import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-bg-primary p-6">
          <div className="text-center max-w-md">
            <AlertTriangle size={48} className="text-expense mx-auto mb-4" />
            <h1 className="text-text-primary font-semibold text-lg mb-2">Что-то пошло не так</h1>
            <p className="text-text-secondary text-sm mb-6">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="px-5 py-2.5 bg-brand text-bg-primary rounded-xl text-sm font-medium hover:bg-brand-light transition-colors"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
