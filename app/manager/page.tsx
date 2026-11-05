'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Eye, EyeOff, Lock, Save, Plus, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

interface MatchRow {
  homePlayerId: string;
  awayPlayerId: string;
  homeScore: string;
  awayScore: string;
  matchweek: number;
}

export default function ManagerPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [lastLoggedAt, setLastLoggedAt] = useState<string | null>(null);

  const [rows, setRows] = useState<MatchRow[]>(
    Array(5).fill(null).map(() => ({ homePlayerId: '', awayPlayerId: '', homeScore: '', awayScore: '', matchweek: 1 }))
  );

  useEffect(() => {
    fetchPlayers();
    fetchLastLog();
  }, []);

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').order('name');
    if (data) setPlayers(data);
  }

  async function fetchLastLog() {
    const { data } = await supabase
      .from('matches')
      .select('played_at')
      .order('played_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.played_at) {
      setLastLoggedAt(new Date(data.played_at).toLocaleString());
    }
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (pin === 'Di001&') setAuthenticated(true);
    else alert('Invalid Admin PIN');
  }

  async function handleSubmitMatches(e: React.FormEvent) {
    e.preventDefault();
    const validRows = rows.filter(r => r.homePlayerId && r.awayPlayerId && r.homeScore !== '' && r.awayScore !== '');

    if (validRows.length === 0) return alert('Fill at least one match row.');

    const payload = validRows.map(r => ({
      home_player_id: r.homePlayerId,
      away_player_id: r.awayPlayerId,
      home_score: parseInt(r.homeScore, 10),
      away_score: parseInt(r.awayScore, 10),
      matchweek: r.matchweek,
    }));

    const { error } = await supabase.from('matches').insert(payload);
    if (!error) {
      alert('Matches successfully recorded!');
      setRows(Array(5).fill(null).map(() => ({ homePlayerId: '', awayPlayerId: '', homeScore: '', awayScore: '', matchweek: 1 })));
      fetchLastLog();
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-epl-lightBg dark:bg-damascus-dark flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-epl-purple p-8 rounded-2xl border border-white/10 w-full max-w-md space-y-4 text-center text-white shadow-2xl">
          <Lock className="w-12 h-12 text-epl-pink mx-auto" />
          <h2 className="text-xl font-bold">Admin Portal Access</h2>
          
          {/* Password with View/Hide Feature */}
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              placeholder="Enter Admin Password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-xl p-3 pr-10 text-center text-lg font-bold tracking-widest focus:outline-none focus:border-epl-pink"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button type="submit" className="w-full py-3 rounded-xl bg-epl-pink font-bold hover:brightness-110">
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-epl-lightBg dark:bg-damascus-dark text-epl-textLight dark:text-white p-4 md:p-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-epl-pink">Hub Manager Entry Portal</h1>
          <Link href="/" className="text-xs bg-black/10 dark:bg-white/10 px-4 py-2 rounded-lg">Back to Standings</Link>
        </div>

        {/* Match Logger Form */}
        <form onSubmit={handleSubmitMatches} className="space-y-4">
          {rows.map((row, idx) => (
            <div key={idx} className="bg-epl-purple p-4 rounded-xl border border-white/10 flex flex-wrap items-center gap-3 text-white">
              <span className="text-xs font-bold text-epl-green w-6">#{idx + 1}</span>
              
              <select
                value={row.matchweek}
                onChange={(e) => {
                  const updated = [...rows];
                  updated[idx].matchweek = parseInt(e.target.value, 10);
                  setRows(updated);
                }}
                className="bg-black/40 border border-white/20 rounded-lg p-2 text-xs font-bold"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>MW{i + 1}</option>
                ))}
              </select>

              <select
                value={row.homePlayerId}
                onChange={(e) => {
                  const updated = [...rows];
                  updated[idx].homePlayerId = e.target.value;
                  setRows(updated);
                }}
                className="flex-1 bg-black/40 border border-white/20 rounded-lg p-2 text-xs"
              >
                <option value="">Home Player</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <input
                type="number"
                placeholder="0"
                value={row.homeScore}
                onChange={(e) => {
                  const updated = [...rows];
                  updated[idx].homeScore = e.target.value;
                  setRows(updated);
                }}
                className="w-14 text-center bg-black/40 border border-white/20 rounded-lg p-2 text-sm font-bold"
              />

              <span className="font-bold text-white/50">VS</span>

              <input
                type="number"
                placeholder="0"
                value={row.awayScore}
                onChange={(e) => {
                  const updated = [...rows];
                  updated[idx].awayScore = e.target.value;
                  setRows(updated);
                }}
                className="w-14 text-center bg-black/40 border border-white/20 rounded-lg p-2 text-sm font-bold"
              />

              <select
                value={row.awayPlayerId}
                onChange={(e) => {
                  const updated = [...rows];
                  updated[idx].awayPlayerId = e.target.value;
                  setRows(updated);
                }}
                className="flex-1 bg-black/40 border border-white/20 rounded-lg p-2 text-xs"
              >
                <option value="">Away Player</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ))}

          <button type="submit" className="w-full py-3.5 rounded-xl bg-epl-green text-epl-purple font-black hover:brightness-110">
            Submit All Matches
          </button>
        </form>
      </div>

      {/* Footer showcasing Last Recorded Log */}
      <footer className="mt-12 text-center text-xs opacity-60 flex items-center justify-center gap-2 border-t border-black/10 dark:border-white/10 pt-4">
        <Clock className="w-4 h-4 text-epl-pink" />
        <span>Last match log recorded at: <strong>{lastLoggedAt || 'No match logs recorded yet'}</strong></span>
      </footer>
    </div>
  );
}