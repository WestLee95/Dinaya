'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Users, X, AlertTriangle, Trash2, CheckCircle2, Lock, Eye, EyeOff, Clock } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchRow {
  homePlayerId: string;
  awayPlayerId: string;
  homeScore: string;
  awayScore: string;
  matchweek: number;
}

export default function ManagerPortal() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  const [players, setPlayers] = useState<any[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastLoggedAt, setLastLoggedAt] = useState<string | null>(null);

  // Modal State Management
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const [rows, setRows] = useState<MatchRow[]>(
    Array(5).fill(null).map(() => ({ homePlayerId: '', awayPlayerId: '', homeScore: '', awayScore: '', matchweek: 1 }))
  );

  useEffect(() => {
    fetchPlayers();
    fetchLastLog();

    // Realtime Listener for Players Table
    const playerChannel = supabase
      .channel('manager-players-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, []);

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').order('name', { ascending: true });
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
    if (pin === 'Di001&') {
      setAuthenticated(true);
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Authentication Failed',
        message: 'The Manager PIN entered is incorrect. Please try again.',
        type: 'warning',
      });
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('players').insert([{ name: newPlayerName.trim() }]);
    setLoading(false);

    if (error) {
      setModalConfig({
        isOpen: true,
        title: 'Registration Error',
        message: error.code === '23505' ? 'A player with this name already exists.' : error.message,
        type: 'warning',
      });
    } else {
      const addedName = newPlayerName.trim();
      setNewPlayerName('');
      setModalConfig({
        isOpen: true,
        title: 'Player Registered',
        message: `Successfully added "${addedName}" to the Dinaya Premier League hub.`,
        type: 'success',
      });
    }
  }

  function confirmDeletePlayer(playerId: string, playerName: string) {
    setModalConfig({
      isOpen: true,
      title: 'Delete Competitor',
      message: `WARNING: Deleting "${playerName}" will remove their personal points and records from the standings. Opponents they played against will retain their points.`,
      type: 'confirm',
      onConfirm: () => executeDeletePlayer(playerId, playerName),
    });
  }

  async function executeDeletePlayer(playerId: string, playerName: string) {
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) {
      setModalConfig({
        isOpen: true,
        title: 'Deletion Failed',
        message: error.message,
        type: 'warning',
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Player Removed',
        message: `"${playerName}" has been successfully removed from the system.`,
        type: 'success',
      });
    }
  }

  async function handleSubmitMatches(e: React.FormEvent) {
    e.preventDefault();
    const validRows = rows.filter(r => r.homePlayerId && r.awayPlayerId && r.homeScore !== '' && r.awayScore !== '');

    if (validRows.length === 0) {
      setModalConfig({
        isOpen: true,
        title: 'Incomplete Entry',
        message: 'Please fill out at least one complete match row before submitting.',
        type: 'warning',
      });
      return;
    }

    const payload = validRows.map(r => ({
      home_player_id: r.homePlayerId,
      away_player_id: r.awayPlayerId,
      home_score: parseInt(r.homeScore, 10),
      away_score: parseInt(r.awayScore, 10),
      matchweek: r.matchweek,
    }));

    const { error } = await supabase.from('matches').insert(payload);
    if (!error) {
      setModalConfig({
        isOpen: true,
        title: 'Matches Logged',
        message: 'All match results have been successfully recorded and synced live!',
        type: 'success',
      });
      setRows(Array(5).fill(null).map(() => ({ homePlayerId: '', awayPlayerId: '', homeScore: '', awayScore: '', matchweek: 1 })));
      fetchLastLog();
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Submission Error',
        message: error.message,
        type: 'warning',
      });
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-epl-lightBg dark:bg-damascus-dark flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-epl-purple p-8 rounded-2xl border border-white/10 w-full max-w-md space-y-4 text-center text-white shadow-2xl">
          <Lock className="w-12 h-12 text-epl-pink mx-auto" />
          <h2 className="text-xl font-bold">Admin Portal Access</h2>
          
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

        <Modal modal={modalConfig} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-epl-lightBg dark:bg-damascus-dark text-white p-6 md:p-12 space-y-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        <header className="flex justify-between items-center border-b border-white/10 pb-5">
          <h1 className="text-3xl font-black text-epl-pink">Hub Manager Portal</h1>
          <div className="flex gap-3">
            <Link href="/manager/edit-results" className="px-5 py-2.5 rounded-xl bg-epl-purpleLight text-sm font-bold border border-white/10 hover:bg-white/10 transition-colors">
              Edit Previous Results
            </Link>
            <Link href="/" className="text-xs bg-white/10 px-4 py-2 rounded-xl flex items-center font-bold">View Table</Link>
          </div>
        </header>

        {/* --- REGISTER PLAYER SECTION --- */}
        <section className="bg-epl-purple p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-epl-green" />
            <h2 className="text-xl font-extrabold">Competitor Management</h2>
          </div>
          <p className="text-sm text-white/60">Register new players so they appear on the live standings immediately with 0 points.</p>
          
          <form onSubmit={handleAddPlayer} className="flex gap-3 max-w-xl">
            <input
              type="text"
              placeholder="E.g., John Doe"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="flex-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-epl-pink"
            />
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl bg-epl-pink font-bold text-sm hover:brightness-110 disabled:opacity-50">
              {loading ? 'Adding...' : 'Register Player'}
            </button>
          </form>
        </section>

        {/* --- REGISTERED PLAYERS TABLE (3 rows per column grid layout) --- */}
        <section className="bg-epl-purple/80 p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-epl-green flex items-center gap-2">
              <Users className="w-5 h-5" /> Registered Players in System ({players.length})
            </h3>
            <span className="text-xs text-white/50">Live sync active</span>
          </div>

          {players.length === 0 ? (
            <p className="text-sm text-white/50 py-4 text-center">No players registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between bg-black/40 border border-white/10 p-3 rounded-xl hover:border-epl-pink/50 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-epl-purpleLight text-epl-green flex items-center justify-center text-xs font-black shrink-0 border border-white/10">
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-sm truncate">{player.name}</span>
                  </div>

                  <button
                    onClick={() => confirmDeletePlayer(player.id, player.name)}
                    title="Delete Player"
                    className="p-2 rounded-lg bg-white/5 hover:bg-epl-pink text-white/70 hover:text-white transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- MATCH LOGGING SECTION --- */}
        <form onSubmit={handleSubmitMatches} className="space-y-4 bg-epl-purple p-6 rounded-2xl border border-white/10 shadow-xl">
          <h3 className="text-lg font-black text-epl-pink mb-4">Batch Match Logger</h3>
          {rows.map((row, idx) => (
            <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/10 flex flex-wrap items-center gap-3 text-white">
              <span className="text-xs font-bold text-epl-green w-6">#{idx + 1}</span>
              
              <select
                value={row.matchweek}
                onChange={(e) => {
                  const updated = [...rows];
                  updated[idx].matchweek = parseInt(e.target.value, 10);
                  setRows(updated);
                }}
                className="bg-black/60 border border-white/20 rounded-lg p-2 text-xs font-bold"
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
                className="flex-1 bg-black/60 border border-white/20 rounded-lg p-2 text-xs"
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
                className="w-14 text-center bg-black/60 border border-white/20 rounded-lg p-2 text-sm font-bold"
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
                className="w-14 text-center bg-black/60 border border-white/20 rounded-lg p-2 text-sm font-bold"
              />

              <select
                value={row.awayPlayerId}
                onChange={(e) => {
                  const updated = [...rows];
                  updated[idx].awayPlayerId = e.target.value;
                  setRows(updated);
                }}
                className="flex-1 bg-black/60 border border-white/20 rounded-lg p-2 text-xs"
              >
                <option value="">Away Player</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ))}

          <button type="submit" className="w-full py-3.5 rounded-xl bg-epl-green text-epl-purple font-black hover:brightness-110 transition-all">
            Submit All Matches
          </button>
        </form>
      </div>

      {/* Footer showcasing Last Recorded Log */}
      <footer className="mt-12 text-center text-xs opacity-60 flex items-center justify-center gap-2 border-t border-white/10 pt-4">
        <Clock className="w-4 h-4 text-epl-pink" />
        <span>Last match log recorded at: <strong>{lastLoggedAt || 'No match logs recorded yet'}</strong></span>
      </footer>

      {/* Gorgeous Modal Component */}
      <Modal modal={modalConfig} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}

// Reusable Sub-component for Smooth Modals
function Modal({ modal, onClose }: { modal: any; onClose: () => void }) {
  return (
    <AnimatePresence>
      {modal.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-md h-fit bg-epl-purple border border-white/20 p-6 rounded-2xl shadow-2xl z-50 text-white space-y-4"
          >
            <div className="flex items-center gap-3">
              {modal.type === 'warning' || modal.type === 'confirm' ? (
                <div className="p-2 rounded-xl bg-epl-pink/20 text-epl-pink">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-epl-green/20 text-epl-green">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              <h3 className="text-lg font-black">{modal.title}</h3>
            </div>

            <p className="text-sm text-white/80 leading-relaxed">{modal.message}</p>

            <div className="flex gap-3 pt-2">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      modal.onConfirm?.();
                      onClose();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-epl-pink text-xs font-bold hover:brightness-110 transition-colors"
                  >
                    Confirm Delete
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-white text-epl-purple text-xs font-black hover:bg-epl-green transition-colors"
                >
                  Okay
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}