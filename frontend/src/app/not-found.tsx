import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="surface-panel max-w-lg p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.08em] text-foreground">
          404
        </h1>
        <h2 className="mt-3 text-xl font-medium text-foreground">ไม่พบหน้าดังกล่าว</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้าเว็บที่คุณกำลังพยายามเข้าถึงไม่มีอยู่ในระบบ หรืออาจถูกย้ายไปยังตำแหน่งอื่นแล้ว
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/login">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับสู่หน้าล็อกอิน
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button>
              กลับสู่หน้าหลัก
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
