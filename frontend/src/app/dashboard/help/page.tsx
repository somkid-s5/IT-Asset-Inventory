'use client';

import { HelpCircle } from 'lucide-react';

export default function HelpPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-6 bg-slate-800 rounded-full border border-slate-700">
                <HelpCircle className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold">Help & Documentation</h2>
            <p className="text-muted-foreground text-center max-w-md">
                We are building out comprehensive guides and video tutorials on how to onboard new assets and manage the credential vault. Stay tuned!
            </p>
        </div>
    );
}
