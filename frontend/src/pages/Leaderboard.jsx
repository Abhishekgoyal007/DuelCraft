// src/pages/Leaderboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetch("http://localhost:4000/leaderboard?limit=50");
        const data = await res.json();
        
        // Backend returns { ok, leaderboard: [...] }
        const leaderboardData = data.leaderboard || data || [];
        setLeaders(leaderboardData);
        
        // Find current user's rank
        if (user?.address && Array.isArray(leaderboardData)) {
          const rank = leaderboardData.findIndex(
            p => (p.walletAddress || p.address)?.toLowerCase() === user.address.toLowerCase()
          );
          if (rank >= 0) {
            setMyRank(rank + 1);
          }
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [user]);

  const getRankBadge = (rank) => {
    if (rank === 1) return { emoji: "🥇", color: "from-yellow-400 to-yellow-600" };
    if (rank === 2) return { emoji: "🥈", color: "from-gray-300 to-gray-500" };
    if (rank === 3) return { emoji: "🥉", color: "from-orange-400 to-orange-600" };
    return { emoji: `#${rank}`, color: "from-purple-500 to-purple-700" };
  };

  const formatAddress = (addr) => {
    if (!addr) return "Anonymous";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getWinRate = (wins, losses) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(180deg, #87CEEB 0%, #98D8E8 30%, #B8E6B8 60%, #90EE90 100%)" }}>
      <Navbar />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-24 h-14 bg-white rounded-full opacity-80" />
      <div className="absolute top-40 right-20 w-32 h-16 bg-white rounded-full opacity-70" />
      <div className="absolute top-24 right-60 w-16 h-10 bg-white rounded-full opacity-90" />
      
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-green-600" />
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-amber-800" />
      
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 
            className="text-6xl font-black mb-3"
            style={{
              textShadow: "4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
              color: "#FFD700"
            }}
          >
            🏆 LEADERBOARD
          </h1>
          <p className="text-amber-800 font-bold text-lg">Top fighters in the arena!</p>
          
          {myRank && (
            <div 
              className="mt-4 inline-block px-6 py-2 rounded-full font-black text-amber-900"
              style={{ background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)", border: "3px solid #B8860B" }}
            >
              Your Rank: #{myRank}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⏳</div>
            <p className="text-amber-800 font-bold">Loading rankings...</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-amber-800 font-bold">No matches played yet. Be the first!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="flex justify-center items-end gap-4 mb-12">
              {/* 2nd Place */}
              {leaders[1] && (
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-2 rounded-full flex items-center justify-center text-5xl shadow-lg" style={{ background: "linear-gradient(135deg, #C0C0C0, #A0A0A0)", border: "4px solid #808080" }}>
                    🥈
                  </div>
                  <div className="rounded-xl p-4 w-36" style={{ background: "linear-gradient(180deg, #fff 0%, #f0f0f0 100%)", border: "4px solid #ccc", boxShadow: "0 4px 0 #999" }}>
                    <div className="text-gray-800 font-black truncate text-sm">{formatAddress(leaders[1].walletAddress || leaders[1].address)}</div>
                    <div className="text-3xl font-black text-amber-600">{leaders[1].wins ?? leaders[1].stats?.wins ?? 0}</div>
                    <div className="text-xs text-gray-500 font-bold">wins</div>
                  </div>
                  <div className="h-24 rounded-t-lg mt-2" style={{ background: "linear-gradient(180deg, #C0C0C0, #A0A0A0)" }}></div>
                </div>
              )}
              
              {/* 1st Place */}
              {leaders[0] && (
                <div className="text-center -mt-8">
                  <div className="w-32 h-32 mx-auto mb-2 rounded-full flex items-center justify-center text-6xl shadow-xl animate-pulse" style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", border: "4px solid #B8860B" }}>
                    🥇
                  </div>
                  <div className="rounded-xl p-4 w-40" style={{ background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)", border: "4px solid #B8860B", boxShadow: "0 6px 0 #8B6914" }}>
                    <div className="text-amber-900 font-black truncate text-sm">{formatAddress(leaders[0].walletAddress || leaders[0].address)}</div>
                    <div className="text-4xl font-black text-amber-900">{leaders[0].wins ?? leaders[0].stats?.wins ?? 0}</div>
                    <div className="text-xs text-amber-700 font-bold">wins</div>
                  </div>
                  <div className="h-32 rounded-t-lg mt-2" style={{ background: "linear-gradient(180deg, #FFD700, #FFA500)" }}></div>
                </div>
              )}
              
              {/* 3rd Place */}
              {leaders[2] && (
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-2 rounded-full flex items-center justify-center text-5xl shadow-lg" style={{ background: "linear-gradient(135deg, #CD7F32, #A0522D)", border: "4px solid #8B4513" }}>
                    🥉
                  </div>
                  <div className="rounded-xl p-4 w-36" style={{ background: "linear-gradient(180deg, #fff 0%, #f0f0f0 100%)", border: "4px solid #ccc", boxShadow: "0 4px 0 #999" }}>
                    <div className="text-gray-800 font-black truncate text-sm">{formatAddress(leaders[2].walletAddress || leaders[2].address)}</div>
                    <div className="text-3xl font-black text-amber-600">{leaders[2].wins ?? leaders[2].stats?.wins ?? 0}</div>
                    <div className="text-xs text-gray-500 font-bold">wins</div>
                  </div>
                  <div className="h-16 rounded-t-lg mt-2" style={{ background: "linear-gradient(180deg, #CD7F32, #A0522D)" }}></div>
                </div>
              )}
            </div>

            {/* Full List */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, #8B4513 0%, #654321 100%)", border: "4px solid #3D2914" }}>
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 text-amber-200 text-sm font-black" style={{ background: "rgba(0,0,0,0.2)" }}>
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-2 text-center">Wins</div>
                <div className="col-span-2 text-center">Losses</div>
                <div className="col-span-2 text-center">Win Rate</div>
              </div>
              
              {/* Rows */}
              {leaders.map((player, idx) => {
                const rank = idx + 1;
                const badge = getRankBadge(rank);
                const playerAddr = player.walletAddress || player.address;
                const isMe = user?.address?.toLowerCase() === playerAddr?.toLowerCase();
                // Backend returns wins/losses at top level, not in stats
                const wins = player.wins ?? player.stats?.wins ?? 0;
                const losses = player.losses ?? player.stats?.losses ?? 0;
                const winRate = getWinRate(wins, losses);
                
                return (
                  <div 
                    key={playerAddr || idx}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                      isMe ? "bg-yellow-500/30" : "hover:bg-white/10"
                    }`}
                    style={{ borderTop: "2px solid rgba(255,255,255,0.1)" }}
                  >
                    <div className="col-span-1">
                      {rank <= 3 ? (
                        <span className="text-2xl">{badge.emoji}</span>
                      ) : (
                        <span className="text-amber-200 font-black">#{rank}</span>
                      )}
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black" style={{ background: "linear-gradient(135deg, #E74C3C, #C0392B)" }}>
                        {(playerAddr || "?")[2]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className={`font-black ${isMe ? "text-yellow-300" : "text-amber-100"}`}>
                          {formatAddress(playerAddr)}
                          {isMe && <span className="ml-2 text-xs">(You)</span>}
                        </div>
                        <div className="text-xs text-amber-300">
                          🪙 {player.coins || 0} coins
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-green-400 font-black text-lg">{wins}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-red-400 font-black text-lg">{losses}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-3 bg-black/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ width: `${winRate}%`, background: "linear-gradient(90deg, #22c55e, #16a34a)" }}
                          ></div>
                        </div>
                        <span className="text-amber-100 font-black text-sm">{winRate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Back button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => navigate("/hub")}
            className="px-8 py-4 font-black text-amber-900 rounded-xl transition hover:scale-105"
            style={{
              background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)",
              border: "4px solid #B8860B",
              boxShadow: "0 4px 0 #8B6914"
            }}
          >
            ← Back to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
