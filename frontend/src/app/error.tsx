'use client';

import { useEffect } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
      <div className="w-full max-w-lg space-y-6">
        <Alert variant="destructive" className="py-8 shadow-2xl">
          <div className="text-center w-full pr-8">
            <AlertTitle className="text-2xl mb-3">System Error</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              An unexpected error occurred within the application.
              Please try refreshing the page or contact the IT administrator if the issue persists.
            </AlertDescription>
          </div>
        </Alert>

        <div className="surface-panel p-6 shadow-xl border-none">
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left group mb-8">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors list-none flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive/50" />
                Technical Error Details (Dev Only)
              </summary>
              <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-muted/50 border border-border/50 p-4 text-[10px] font-mono text-muted-foreground">
                {error.toString()}
                {"\n\nStack Trace:\n"}
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={reset} className="w-full sm:w-auto h-12 px-8 shadow-lg shadow-primary/20 text-sm font-bold">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/dashboard')} className="w-full sm:w-auto h-12 px-8 bg-card text-sm font-bold">
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
