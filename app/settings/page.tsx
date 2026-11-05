'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [theme, setTheme] = useState<'system' | 'dark' | 'light'>('system');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-epl-lightBg dark:bg-damascus-dark text-epl-textLight dark:text-white p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/" className="flex items-center gap-2 text-xs font-bold text-epl-pink">
        <ArrowLeft className="w-4 h-4" /> Back to Standings
      </Link>

      <h1 className="text-2xl font-black">Dinaya Premier League Settings</h1>

      <div className="bg-epl-lightCard dark:bg-epl-purple/80 p-6 rounded-2xl border border-black/10 dark:border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold uppercase opacity-60">Theme Mode</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'system', label: 'System Default', icon: Monitor },
            { id: 'dark', label: 'Dark Damascus', icon: Moon },
            { id: 'light', label: 'EPL Light Mode', icon: Sun },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as any)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-bold gap-2 ${
                  theme === item.id
                    ? 'border-epl-pink bg-epl-pink/10 text-epl-pink'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}