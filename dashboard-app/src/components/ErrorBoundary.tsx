import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-zinc-800 text-white p-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Coś poszło nie tak</h1>
          <p className="text-sm text-zinc-400 mb-6 max-w-md text-center">
            Wystąpił nieoczekiwany problem z aplikacją. Odśwież stronę, aby kontynuować.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl font-semibold transition-colors"
          >
            Odśwież stronę
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
