'use client';

import { Bug } from 'lucide-react';

export default function PatchesPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-6 bg-primary/10 rounded-full">
                <Bug className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Patch Tracking</h2>
            <p className="text-muted-foreground text-center max-w-md">
                This feature is currently in development. Future updates will include automated vulnerability scanning and patch deployment tracking.
            </p>
        </div>
    );
}
