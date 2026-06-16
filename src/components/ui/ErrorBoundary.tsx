import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-garda-bg flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-garda-pink/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-garda-pink" />
            </div>
            <h1 className="text-xl font-bold mb-2">Terjadi Kesalahan</h1>
            <p className="text-sm text-garda-text-secondary mb-4">
              {this.state.error?.message || 'Terjadi kesalahan yang tidak terduga.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-garda-surface border border-garda-border text-sm font-medium hover:border-garda-border-hover transition-colors"
            >
              <RefreshCcw className="w-4 h-4" /> Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
