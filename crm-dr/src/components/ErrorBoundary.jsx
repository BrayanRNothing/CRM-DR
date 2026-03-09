import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 text-red-900 min-h-screen">
          <h1 className="text-3xl font-bold mb-4">Algo salió mal 😢</h1>
          <p className="mb-4">Se ha producido un error en la aplicación:</p>
          <div className="bg-white p-6 rounded shadow border border-red-200 overflow-auto">
            <p className="font-mono text-red-600 font-bold mb-2">
              {this.state.error && this.state.error.toString()}
            </p>
            <details className="whitespace-pre-wrap text-sm text-gray-600">
              <summary className="cursor-pointer mb-2 font-semibold">Ver detalles técnicos</summary>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
