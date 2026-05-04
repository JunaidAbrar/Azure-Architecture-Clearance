import { Component } from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (in production, send to monitoring service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // In production, you would send this to Application Insights
    // appInsights.trackException({ error, severityLevel: 3 });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="card max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clearance-fail/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-clearance-fail"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-clearance-text mb-2">
              Something went wrong
            </h2>

            <p className="text-clearance-text-muted mb-6">
              {this.props.message ||
                "We encountered an unexpected error. Please try again."}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="btn-primary"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                Reload Page
              </button>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-clearance-text-muted cursor-pointer">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 p-3 bg-clearance-bg rounded text-xs text-clearance-fail overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline error display for non-critical errors
 */
export const ErrorMessage = ({ message, onRetry }) => (
  <div className="p-4 bg-clearance-fail/10 border border-clearance-fail/30 rounded-lg">
    <div className="flex items-start gap-3">
      <svg
        className="w-5 h-5 text-clearance-fail flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="flex-1">
        <p className="text-clearance-fail font-medium">Error</p>
        <p className="text-clearance-text-muted text-sm mt-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-sm text-clearance-pass hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  </div>
);

/**
 * Empty state component
 */
export const EmptyState = ({ title, message, action, actionLabel }) => (
  <div className="py-12 text-center">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clearance-bg-secondary flex items-center justify-center">
      <svg
        className="w-8 h-8 text-clearance-text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-clearance-text mb-1">{title}</h3>
    <p className="text-clearance-text-muted mb-4">{message}</p>
    {action && (
      <button onClick={action} className="btn-primary">
        {actionLabel || "Get Started"}
      </button>
    )}
  </div>
);

export default ErrorBoundary;
