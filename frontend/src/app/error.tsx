'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="th">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="surface-panel max-w-lg p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="font-display text-2xl font-semibold uppercase tracking-[0.08em] text-foreground">
              ข้อผิดพลาดของระบบ
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              เกิดข้อผิดพลาดที่ไม่คาดคิดในการทำงานของระบบ กรุณาลองโหลดหน้านี้ใหม่อีกครั้ง
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground">รายละเอียดข้อผิดพลาด (สำหรับผู้พัฒนา)</summary>
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs">
                  {error.toString()}
                  {error.stack}
                </pre>
              </details>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button onClick={reset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                ลองใหม่อีกครั้ง
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
                <Home className="mr-2 h-4 w-4" />
                กลับสู่หน้าหลัก
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
