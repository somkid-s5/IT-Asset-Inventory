'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-6 bg-slate-800 rounded-full border border-slate-700">
                <Settings className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold">Preferences & Settings</h2>
            <p className="text-muted-foreground text-center max-w-md">
                Configure your SOC dashboard, manage API keys, and set up alert routing integrations here. Coming soon.
            </p>
        </div>
    );
}
