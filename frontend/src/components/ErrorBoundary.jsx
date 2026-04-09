import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('UI error boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="mx-auto mt-20 max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-100">
                    <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
                    <h2 className="text-xl font-semibold">Something went wrong</h2>
                    <p className="mt-2 text-sm text-red-100/80">The interface hit an unexpected error. Please reload the page.</p>
                    <Button
                        className="mt-5"
                        variant="danger"
                        onClick={() => {
                            this.setState({ hasError: false });
                            window.location.reload();
                        }}
                    >
                        Reload App
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
