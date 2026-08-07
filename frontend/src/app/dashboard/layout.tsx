'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { useEffect } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Add effect to properly redirect when not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                {loading ? 'Loading your workspace...' : 'Redirecting to sign in...'}
            </div>
        );
    }

    return (
        <AppLayout>
            {children}
        </AppLayout>
    );
}
