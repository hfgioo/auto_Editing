import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-claude-surface flex items-center justify-center p-6">
          <div className="card max-w-lg text-center">
            <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-claude-error mb-4" />
            <h2 className="text-2xl font-semibold text-claude-text-primary mb-2">
              出错了
            </h2>
            <p className="text-claude-text-secondary mb-4">
              应用遇到了一个错误。请刷新页面重试。
            </p>
            {this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-claude-text-tertiary mb-2">
                  错误详情
                </summary>
                <pre className="text-xs bg-claude-surface p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
