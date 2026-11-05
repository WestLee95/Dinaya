'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, RotateCcw, X, Check } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import Image from 'next/image';

interface PlayerStat {
  id: string;
  name: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: ('W' | 'D' | 'L')[];
}

export default function StandingsPage() {
  const [standings, setStandings] = useState<PlayerStat[]>([]);
  const [selectedMw, setSelectedMw] = useState<number | null>(null); // null = All Matchweeks
  const [tempMw, setTempMw] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (allPlayers.length > 0) {
      calculateStandings(selectedMw);
    }
  }, [selectedMw, allMatches, allPlayers]);

  async function fetchData() {
    const { data: players } = await supabase.from('players').select('*');
    const { data: matches } = await supabase.from('matches').select('*');
    if (players) setAllPlayers(players);
    if (matches) setAllMatches(matches);
  }

  function calculateStandings(mwLimit: number | null) {
    const statsMap: Record<string, PlayerStat> = {};

    allPlayers.forEach((p) => {
      statsMap[p.id] = {
        id: p.id,
        name: p.name,
        mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
        form: [],
      };
    });

    // Filter matches up to selected Matchweek
    const filteredMatches = mwLimit
      ? allMatches.filter((m) => m.matchweek <= mwLimit)
      : allMatches;

    filteredMatches.forEach((m) => {
      const home = statsMap[m.home_player_id];
      const away = statsMap[m.away_player_id];

      if (home && away) {
        home.mp++; away.mp++;
        home.gf += m.home_score; home.ga += m.away_score;
        away.gf += m.away_score; away.ga += m.home_score;

        if (m.home_score > m.away_score) {
          home.w++; home.pts += 3; home.form.unshift('W');
          away.l++; away.form.unshift('L');
        } else if (m.away_score > m.home_score) {
          away.w++; away.pts += 3; away.form.unshift('W');
          home.l++; home.form.unshift('L');
        } else {
          home.d++; home.pts += 1; home.form.unshift('D');
          away.d++; away.pts += 1; away.form.unshift('D');
        }
      }
    });

    const sortedList = Object.values(statsMap).map((s) => ({
      ...s,
      gd: s.gf - s.ga,
      form: s.form.slice(0, 5),
    }));

    // Standard EPL Tie-Breakers
    sortedList.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.w - a.w);
    setStandings(sortedList);
  }

  function handleApplyMw() {
    setSelectedMw(tempMw);
    setIsDrawerOpen(false);
  }

  function handleReset() {
    setSelectedMw(null);
    setTempMw(null);
  }

  return (
    <div className="min-h-screen bg-epl-lightBg dark:bg-damascus-dark text-epl-textLight dark:text-white p-4 md:p-8 transition-colors duration-300">
      <div
          className="fixed inset-0 z-0 opacity-20 contrast-125"
          style={{
            backgroundImage: 'url(/Damascus.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      
      <div className="max-w-7xl mx-auto space-y-6 z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-epl-purple flex items-center justify-center p-1.5 shadow-lg border border-epl-green/30 relative overflow-hidden">
      <Image
        src="/DPL.svg" // Relative path to your file inside the /public folder
        alt="Dinaya Premier League Logo"
        width={50}
        height={50}
        className="w-full h-full object-contain rounded-full"
        priority
      />
    </div>
            
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">DINAYA PREMIER LEAGUE</h1>
              <p className="text-xs text-black/60 dark:text-white/60 font-semibold">Season 2026/27</p>
            </div>
          </div>
          <Link href="/settings" className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:opacity-80 transition-opacity">
            <Settings className="w-5 h-5 text-epl-pink" />
          </Link>
        </header>

        {/* EPL Control Bar */}
        <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-2xl backdrop-blur-md border border-black/10 dark:border-white/10">
          
          {/* Matchweek Dropdown Trigger */}
          <button
            onClick={() => {
              setTempMw(selectedMw);
              setIsDrawerOpen(true);
            }}
            className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-epl-purple text-white text-xs font-bold hover:brightness-110"
          >
            <span>{selectedMw ? `MW${selectedMw}` : 'All Matchweeks'}</span>
            <ChevronDown className="w-4 h-4 text-epl-green" />
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-bold hover:bg-black/20 dark:hover:bg-white/20"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* EPL Standings Table */}
        <div className="bg-epl-lightCard dark:bg-epl-purple/80 backdrop-blur-xl rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-black/5 dark:bg-black/40 text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
                <tr>
                  <th className="py-4 px-4 w-12 text-center">Pos</th>
                  <th className="py-4 px-6">Player</th>
                  <th className="py-4 px-3 text-center">Pl</th>
                  <th className="py-4 px-3 text-center">W</th>
                  <th className="py-4 px-3 text-center">D</th>
                  <th className="py-4 px-3 text-center">L</th>
                  <th className="py-4 px-3 text-center">GF</th>
                  <th className="py-4 px-3 text-center">GA</th>
                  <th className="py-4 px-3 text-center">GD</th>
                  <th className="py-4 px-4 text-center font-extrabold text-epl-pink dark:text-epl-green">Pts</th>
                  <th className="py-4 px-6 text-center">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {standings.map((player, idx) => (
                  <tr key={player.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-center font-bold relative">
                      <span className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? 'bg-epl-green' : idx < 4 ? 'bg-epl-pink' : 'bg-transparent'}`} />
                      {idx + 1}
                    </td>
                    <td className="py-4 px-6 font-bold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-epl-purple text-white flex items-center justify-center text-xs font-black">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                      {player.name}
                    </td>
                    <td className="py-4 px-3 text-center opacity-80">{player.mp}</td>
                    <td className="py-4 px-3 text-center opacity-80">{player.w}</td>
                    <td className="py-4 px-3 text-center opacity-80">{player.d}</td>
                    <td className="py-4 px-3 text-center opacity-80">{player.l}</td>
                    <td className="py-4 px-3 text-center opacity-80">{player.gf}</td>
                    <td className="py-4 px-3 text-center opacity-80">{player.ga}</td>
                    <td className="py-4 px-3 text-center font-medium">{player.gd > 0 ? `+${player.gd}` : player.gd}</td>
                    <td className="py-4 px-4 text-center font-black text-base text-epl-pink dark:text-epl-green">{player.pts}</td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-1.5">
                        {player.form.map((res, i) => (
                          <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            res === 'W' ? 'bg-epl-green text-epl-purple' : res === 'D' ? 'bg-gray-400 text-black' : 'bg-epl-pink text-white'
                          }`}>
                            {res}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {/* Matchweek Filter Slide-over Drawer */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              {/* Dimmed Background Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 bg-black backdrop-blur-sm z-40"
              />

              {/* Right Menu Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-epl-purple text-white z-50 p-6 flex flex-col justify-between shadow-2xl"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h2 className="text-xl font-black">Matchweeks</h2>
                    <button onClick={() => setIsDrawerOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                      <X className="w-5 h-5 text-white/70" />
                    </button>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-2">
                    {/* All Matchweeks Choice */}
                    <button
                      onClick={() => setTempMw(null)}
                      className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <span className="font-bold text-sm">All Matchweeks</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${tempMw === null ? 'border-epl-pink bg-epl-pink' : 'border-white/30'}`}>
                        {tempMw === null && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>

                    {/* MW1 to MW12 List */}
                    {Array.from({ length: 12 }).map((_, i) => {
                      const mwNum = i + 1;
                      return (
                        <button
                          key={mwNum}
                          onClick={() => setTempMw(mwNum)}
                          className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-colors"
                        >
                          <span className="font-bold text-sm">MW{mwNum}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${tempMw === mwNum ? 'border-epl-pink bg-epl-pink' : 'border-white/30'}`}>
                            {tempMw === mwNum && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleApplyMw}
                  className="w-full py-3.5 rounded-full bg-white text-epl-purple font-black hover:bg-epl-green transition-colors text-sm"
                >
                  Save
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}