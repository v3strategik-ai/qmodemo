import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Temporarily disable error boundary UI - just log errors
    console.error('ErrorBoundary caught error (not showing UI):', error);
    return { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Only show error boundary for critical errors
    if (error && error.name && (error.name.includes('ChunkLoadError') || error.name.includes('ReferenceError') || error.name.includes('TypeError'))) {
      this.setState({
        error: error,
        errorInfo: errorInfo,
        hasError: true
      });
    } else {
      console.warn('ErrorBoundary: Not showing error UI for non-critical error');
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center relative">
          <div className="circuit-bg" />
          <div className="bg-grid" />
          
          <Card className="glass p-8 w-full max-w-md relative z-10 text-center">
            <div className="text-red-400 mb-4">
              <AlertTriangle className="w-16 h-16 mx-auto" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-4">
              Something went wrong
            </h2>
            
            <p className="text-gray-300 mb-6">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full tech-button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full glass neon-border hover:bg-white/10"
              >
                Go to Home
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-red-300 bg-black/30 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;