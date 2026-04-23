'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6">
      <div className="surface-panel max-w-lg p-8 text-center shadow-xl border-none">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
          System Error
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          An unexpected error occurred within the application. 
          Please try refreshing the page or contact the IT administrator if the issue persists.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left group">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors list-none flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive/50" />
              Technical Error Details (Dev Only)
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted/50 border border-border/50 p-4 text-[10px] font-mono text-muted-foreground">
              {error.toString()}
              {"\n\nStack Trace:\n"}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="w-full sm:w-auto h-10 shadow-lg shadow-primary/20">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')} className="w-full sm:w-auto h-10 bg-card">
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
