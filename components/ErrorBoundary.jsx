'use client';
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);

        // Report to the server log stream; Sentry captures uncaught client errors too.
        try {
            const payload = {
                message: error?.message || 'Unknown error',
                stack: error?.stack?.slice(0, 2000) || '',
                componentStack: errorInfo?.componentStack?.slice(0, 1000) || '',
                url: typeof window !== 'undefined' ? window.location.href : '',
                timestamp: new Date().toISOString(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            };

            fetch('/api/log-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(() => {}); // fire and forget
        } catch (e) {
            // Don't let error reporting cause more errors
        }

        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            const errorMessage = this.state.error?.message || '';

            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-lg w-full text-center">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            An unexpected error occurred. Your saved data is safe.
                        </p>

                        {/* Show error details in dev/debug */}
                        {errorMessage && (
                            <details className="text-left mb-4">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                    Error details
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-[11px] text-red-600 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                                    {errorMessage}
                                </pre>
                                {this.state.errorInfo?.componentStack && (
                                    <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-[10px] text-gray-400 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                                        {this.state.errorInfo.componentStack.slice(0, 500)}
                                    </pre>
                                )}
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard/search'}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Go to Search
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
