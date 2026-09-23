import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { safeStorage } from '../utils/storage';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Portal continuity catch:', error, errorInfo);
  }

  handleReset = () => {
    safeStorage.removeItem('intellect_bank_user_email');
    safeStorage.removeItem('indiabank_user_email');
    try {
      window.location.reload();
    } catch {
      this.setState({ hasError: false, error: undefined });
    }
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
          <div className="card bg-white border border-slate-200 shadow-sm rounded-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              Portal Continuity Notice
            </h2>
            <p className="text-sm text-slate-600">
              An unexpected render event occurred. You can safely reload the banking session or return to the sign-in screen.
            </p>
            {this.state.error && (
              <div className="text-[11px] font-mono bg-slate-50 p-2.5 rounded text-slate-600 text-left overflow-x-auto border border-slate-200">
                {this.state.error.message || 'Script error'}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleDismiss}
                className="px-4 py-2.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Return to Portal</span>
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors border border-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

