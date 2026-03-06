import React from 'react';
import config from '../config';

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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Fire-and-forget error tracking to backend
    fetch(`${config.API_URL}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: 'critical',
        source: 'ErrorBoundary',
        message: error.message,
        stack: error.stack,
        context_json: { componentStack: errorInfo.componentStack?.slice(0, 500) }
      })
    }).catch(() => {});
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#F7F6F2',
          fontFamily: "'Work Sans', sans-serif",
          color: '#402D21'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐪</div>
          <h1 style={{ fontSize: '24px', marginBottom: '8px', fontFamily: "'P22 Mackinac Pro', serif" }}>
            Algo salio mal
          </h1>
          <p style={{ fontSize: '16px', color: '#8B7355', marginBottom: '24px', maxWidth: '400px' }}>
            Ocurrio un error inesperado. Tus datos estan seguros.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 32px',
              backgroundColor: '#A68050',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              cursor: 'pointer',
              fontFamily: "'Work Sans', sans-serif"
            }}
          >
            Volver al inicio
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
