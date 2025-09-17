// frontend/src/main.jsx - MyMentalHealthBuddy™ V10·PERFECTION Main Entry
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Error boundary for production
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 React Error Boundary:', error, errorInfo);
    
    // Track error in analytics if available
    if (window.trackEvent) {
      window.trackEvent('error', 'react_error', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏥 MyMentalHealthBuddy™</h1>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Something went wrong</h2>
          <p style={{ marginBottom: '2rem', maxWidth: '600px' }}>
            We're sorry, but there was an unexpected error. Don't worry - your mental health journey is important to us.
          </p>
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: '#fff',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#fff',
                border: '2px solid white',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '2rem'
          }}>
            <h3>🚨 Crisis Resources Always Available:</h3>
            <p>Emergency: <strong>911</strong> | Suicide Prevention: <strong>988</strong> | Crisis Text: <strong>741741</strong></p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize the application
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
  if (window.trackEvent) {
    window.trackEvent('error', 'global_error', event.error?.message || 'Unknown error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  if (window.trackEvent) {
    window.trackEvent('error', 'unhandled_rejection', String(event.reason));
  }
});

// Performance monitoring
if (typeof window !== 'undefined' && 'performance' in window) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData && window.trackEvent) {
        window.trackEvent('performance', 'page_load', Math.round(perfData.loadEventEnd - perfData.fetchStart));
      }
    }, 0);
  });
}
