'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md space-y-8 glass-card p-8 border border-destructive/20 relative overflow-hidden shadow-2xl rounded-2xl"
      >
        {/* Glow decoration */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-4 border border-destructive/20 animate-pulse">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground text-wrap-balance">
            Access Denied
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed text-wrap-pretty max-w-xs">
            You do not have the required administrator privileges to view this page. If you believe this is an error, please contact your IT administrator.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full sm:w-auto h-11 px-6 bg-card border-border hover:bg-muted font-bold text-sm transition-all"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto h-11 px-6 shadow-lg shadow-primary/20 font-bold text-sm transition-all"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
