import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Ufanget applikasjonsfeil:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('mintrener_interrupted_session');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] w-full bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-400 rounded-3xl shadow-xl">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h1 className="text-lg font-black text-white">Oops, noe gikk galt</h1>
            <p className="text-xs text-zinc-400">
              Appen støtte på en uventet feil, men dine data er trygge.
            </p>
          </div>

          {this.state.error && (
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-left overflow-auto max-h-40">
              <p className="text-[11px] font-mono text-rose-300 font-bold break-words">
                {this.state.error.message}
              </p>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950"
          >
            <RotateCcw className="w-4 h-4" />
            Start appen på nytt
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
