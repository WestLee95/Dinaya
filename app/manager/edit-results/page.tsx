'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Search, Filter, Calendar, Save, Trash2, ArrowLeft, X, Edit2 } from 'lucide-react';
import Link from 'next/link';

export default function EditResultsPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  
  // FILTER STATES
  const [searchPlayer, setSearchPlayer] = useState('');
  const [filterMatchweek, setFilterMatchweek] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD

  // Edit fields
  const [editedHomeScore, setEditedHomeScore] = useState('');
  const [editedAwayScore, setEditedAwayScore] = useState('');

  useEffect(() => {
    fetchBaseData();
  }, []);

  async function fetchBaseData() {
    const { data: playerData } = await supabase.from('players').select('id, name');
    if (playerData) setPlayers(playerData);
    handleSearch();
  }

  async function handleSearch() {
    setLoading(true);
    setEditingMatchId(null);
    
    let query = supabase
      .from('matches')
      .select(`
        id, 
        home_player_id, 
        away_player_id, 
        home_score, 
        away_score, 
        matchweek, 
        played_at,
        home:players!matches_home_player_id_fkey(id, name),
        away:players!matches_away_player_id_fkey(id, name)
      `)
      .order('played_at', { ascending: false });

    if (searchPlayer.trim()) {
      query = query.or(`home.name.ilike.%${searchPlayer.trim()}%,away.name.ilike.%${searchPlayer.trim()}%`);
    }

    if (filterMatchweek !== 'all') {
      query = query.eq('matchweek', parseInt(filterMatchweek, 10));
    }

    if (filterDate) {
      query = query.gte('played_at', filterDate + 'T00:00:00.000Z')
                   .lte('played_at', filterDate + 'T23:59:59.999Z');
    }

    const { data } = await query;
    if (data) setMatches(data);
    setLoading(false);
  }

  function startEditing(match: any) {
    setEditingMatchId(match.id);
    setEditedHomeScore(match.home_score.toString());
    setEditedAwayScore(match.away_score.toString());
  }

  async function saveMatchEdit(matchId: string) {
    const homeScore = parseInt(editedHomeScore, 10);
    const awayScore = parseInt(editedAwayScore, 10);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      alert('Please enter valid, non-negative scores.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
      })
      .eq('id', matchId);

    setLoading(false);
    if (!error) {
      alert('Match result successfully updated.');
      setEditingMatchId(null);
      handleSearch();
    } else {
      alert('Failed to update match: ' + error.message);
    }
  }

  // --- Deletion Handler for Match Results ---
  async function handleDeleteMatch(matchId: string) {
    const confirmed = window.confirm(
      "WARNING: Are you sure you want to delete this match result? This will remove the match record and adjust the players' points accordingly."
    );

    if (!confirmed) return;

    setLoading(true);
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    setLoading(false);

    if (error) {
      alert('Failed to delete match result: ' + error.message);
    } else {
      alert('Match result successfully deleted.');
      handleSearch(); // Refresh list
    }
  }

  return (
    <div className="min-h-screen bg-epl-lightBg dark:bg-damascus-dark text-white p-6 md:p-12">
      <header className="flex items-center gap-4 mb-10 border-b border-white/10 pb-5">
        <Link href="/manager" className="p-2 rounded-lg hover:bg-white/10 text-white/60">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-black text-epl-pink">Edit Previous Results</h1>
      </header>

      {/* --- SEARCH & FILTER BAR --- */}
      <section className="bg-epl-purple p-5 rounded-2xl border border-white/10 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> Player Search</label>
          <input
            type="text"
            placeholder="Search Player..."
            value={searchPlayer}
            onChange={(e) => setSearchPlayer(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-epl-pink"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Matchweek (MW)</label>
          <select
            value={filterMatchweek}
            onChange={(e) => setFilterMatchweek(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-epl-pink"
          >
            <option value="all">All Matchweeks</option>
            {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>MW{i+1}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Specific Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-epl-pink"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="py-2.5 rounded-xl bg-epl-pink font-bold text-sm hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'Searching...' : 'Apply Filters'}
        </button>
      </section>

      {/* --- RESULTS TABLE --- */}
      <section className="bg-epl-purple/80 p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-black/40 text-white/60 border-b border-white/10">
              <tr>
                <th className="py-4 px-4 w-12 text-center">MW</th>
                <th className="py-4 px-3 text-center">Date</th>
                <th className="py-4 px-6 text-right">Home Player</th>
                <th className="py-4 px-3 text-center">Score</th>
                <th className="py-4 px-6 text-left">Away Player</th>
                <th className="py-4 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {matches.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-white/50">No matches found matching your filters.</td></tr>
              )}
              {matches.map((match) => (
                <tr key={match.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-center font-bold text-epl-pink">MW{match.matchweek}</td>
                  <td className="py-4 px-3 text-center text-xs opacity-60">{new Date(match.played_at).toLocaleDateString()}</td>
                  <td className="py-4 px-6 text-right font-bold">{match.home?.name || 'Unknown'}</td>
                  
                  <td className="py-4 px-3 text-center font-black text-lg text-white">
                    {editingMatchId === match.id ? (
                      <div className="flex items-center gap-1 justify-center max-w-24 mx-auto">
                        <input
                          type="number"
                          value={editedHomeScore}
                          onChange={(e) => setEditedHomeScore(e.target.value)}
                          className="w-10 text-center bg-white/10 border border-epl-pink rounded p-1 text-white font-black"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          value={editedAwayScore}
                          onChange={(e) => setEditedAwayScore(e.target.value)}
                          className="w-10 text-center bg-white/10 border border-epl-pink rounded p-1 text-white font-black"
                        />
                      </div>
                    ) : (
                      `${match.home_score} - ${match.away_score}`
                    )}
                  </td>
                  
                  <td className="py-4 px-6 text-left font-bold">{match.away?.name || 'Unknown'}</td>
                  
                  {/* Actions Column: Edit, Save/Cancel, and Delete X Icon */}
                  <td className="py-4 px-3 text-center">
                    {editingMatchId === match.id ? (
                      <div className="flex items-center gap-2 justify-center">
                        <button onClick={() => saveMatchEdit(match.id)} className="p-1.5 rounded-lg bg-epl-green hover:brightness-110" title="Save">
                          <Save className="w-3.5 h-3.5 text-epl-purple" />
                        </button>
                        <button onClick={() => setEditingMatchId(null)} className="p-1.5 rounded-lg bg-black/50 hover:bg-white/10" title="Cancel">
                          <X className="w-3.5 h-3.5 text-white/70" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center">
                        {/* Edit Pen Icon */}
                        <button onClick={() => startEditing(match)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10" title="Edit Result">
                          <Edit2 className="w-3.5 h-3.5 text-epl-green" />
                        </button>
                        
                        {/* Delete 'X' Icon */}
                        <button onClick={() => handleDeleteMatch(match.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-epl-pink text-white/70 hover:text-white transition-colors" title="Delete Result">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}