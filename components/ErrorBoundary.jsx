'use client';
import React from 'react';

export class ErrorBoundary extends React.Component {
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
                <div className="p-8 max-w-2xl mx-auto mt-20 bg-white rounded-xl shadow-xl border border-red-200">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h2>
                    <p className="mb-4 text-gray-700">Please send this error to the developer:</p>
                    <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs font-mono border border-gray-300">
                        <p className="font-bold text-red-800 mb-2">{this.state.error && this.state.error.toString()}</p>
                        <pre className="text-gray-600 whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
