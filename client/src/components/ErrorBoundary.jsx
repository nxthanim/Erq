import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    padding: '24px',
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    padding: '48px 32px',
    borderRadius: '24px',
    backgroundColor: '#fafafb',
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    backgroundColor: '#e7f5ef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  title: {
    fontFamily: 'var(--font-signifier)',
    fontWeight: 400,
    fontSize: '28px',
    color: '#173a32',
    marginBottom: '8px',
    letterSpacing: '-0.66px',
  },
  subtitle: {
    fontFamily: 'var(--font-sohne)',
    fontSize: '15px',
    color: '#777b86',
    lineHeight: 1.5,
    marginBottom: '8px',
  },
  error: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#979799',
    backgroundColor: '#f2f2f3',
    padding: '12px 16px',
    borderRadius: '12px',
    marginTop: '16px',
    marginBottom: '24px',
    wordBreak: 'break-word',
    maxHeight: '80px',
    overflow: 'auto',
    textAlign: 'left',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: '#173a32',
    color: '#ffffff',
    fontFamily: 'var(--font-sohne)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '9999px',
    border: '1px solid #173a32',
    backgroundColor: 'transparent',
    color: '#173a32',
    fontFamily: 'var(--font-sohne)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to monitoring
    if (typeof window !== 'undefined' && window.__monitor) {
      window.__monitor.error('React Error Boundary caught:', { error: error?.toString(), componentStack: errorInfo?.componentStack });
    }
    console.error('[ErrorBoundary]', error?.toString(), errorInfo?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMsg = this.state.error?.toString() || 'Unknown error';

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>
              <AlertTriangle size={32} style={{ color: '#1f6f5c' }} />
            </div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.subtitle}>
              An unexpected error occurred. Our team has been notified.
            </p>
            <div style={styles.error}>
              {errorMsg}
            </div>
            <div style={styles.buttonRow}>
              <button
                onClick={this.handleReset}
                style={styles.primaryButton}
                onMouseEnter={e => e.target.style.opacity = '0.8'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoBack}
                style={styles.ghostButton}
                onMouseEnter={e => e.target.style.opacity = '0.7'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              >
                <ArrowLeft size={16} />
                Go Back
              </button>
              <button
                onClick={this.handleGoHome}
                style={styles.ghostButton}
                onMouseEnter={e => e.target.style.opacity = '0.7'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              >
                <Home size={16} />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
