'use client';

import { MessageSquare } from 'lucide-react';

export default function FeedbackPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-6 bg-slate-800 rounded-full border border-slate-700">
                <MessageSquare className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold">Feedback Hub</h2>
            <p className="text-muted-foreground text-center max-w-md">
                We'd love to hear your thoughts on the new SOC layout. A direct feedback form will be available here soon.
            </p>
        </div>
    );
}
