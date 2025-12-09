// src/pages/Leaderboard.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FloatingNav } from "../components/FloatingNav";

// Particle background
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + (i % 3) * 2}px`,
            height: `${3 + (i % 3) * 2}px`,
            left: `${(i * 7) % 100}%`,
            top: `${(i * 11) % 100}%`,
            background: i % 2 === 0 ? '#FFD700' : '#22C55E',
            opacity: 0.3,
            animation: `particle-float ${5 + (i % 3)}s ease-in-out infinite ${i * 0.4}s`
          }}
        />
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetch("http://localhost:4000/leaderboard?limit=50");
        const data = await res.json();

        const leaderboardData = data.leaderboard || data || [];
        setLeaders(leaderboardData);

        if (user?.address && Array.isArray(leaderboardData)) {
          const rank = leaderboardData.findIndex(
            p => (p.walletAddress || p.address)?.toLowerCase() === user.address.toLowerCase()
          );
          if (rank >= 0) setMyRank(rank + 1);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [user]);

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Hall of Frame Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/assets/background/hallofframe.png)',
          backgroundPosition: 'center'
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/50" />

      <ParticleBackground />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Animated glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-yellow-500 rounded-full filter blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-green-500 rounded-full filter blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className={`max-w-5xl mx-auto px-4 py-8 relative z-10 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black mb-3 font-display text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600"
            style={{ textShadow: "0 0 60px rgba(255, 215, 0, 0.4)" }}>
            🏆 HALL OF FAME
          </h1>
          <p className="text-emerald-300/80 font-semibold text-lg">Top fighters in the arena!</p>

          {myRank && (
            <div className="mt-4 inline-block px-6 py-3 rounded-2xl font-black text-amber-900 bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-yellow-600 shadow-lg shadow-yellow-500/30 font-display">
              Your Rank: #{myRank}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⏳</div>
            <p className="text-white/70 font-bold">Loading rankings...</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-white/70 font-bold">No matches played yet. Be the first!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="flex justify-center items-end gap-4 mb-12">
              {/* 2nd Place */}
              {leaders[1] && (
                <div className="text-center animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <div className="w-24 h-24 mx-auto mb-3 rounded-full flex items-center justify-center text-5xl shadow-xl border-4 border-gray-500"
                    style={{ background: "linear-gradient(135deg, #C0C0C0, #808080)" }}>
                    🥈
                  </div>
                  <div className="rounded-2xl p-4 w-36 border-2 border-gray-500/50"
                    style={{ background: "linear-gradient(145deg, rgba(192,192,192,0.2), rgba(128,128,128,0.1))", backdropFilter: "blur(10px)" }}>
                    <div className="text-white font-black truncate text-sm font-display">{formatAddress(leaders[1].walletAddress || leaders[1].address)}</div>
                    <div className="text-3xl font-black text-gray-300 font-display">{leaders[1].wins ?? leaders[1].stats?.wins ?? 0}</div>
                    <div className="text-xs text-gray-400 font-bold">wins</div>
                  </div>
                  <div className="h-20 rounded-t-xl mt-2" style={{ background: "linear-gradient(180deg, #C0C0C0, #808080)" }} />
                </div>
              )}

              {/* 1st Place */}
              {leaders[0] && (
                <div className="text-center -mt-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <div className="w-32 h-32 mx-auto mb-3 rounded-full flex items-center justify-center text-6xl shadow-2xl border-4 border-yellow-500 animate-pulse"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 40px rgba(255, 215, 0, 0.5)" }}>
                    🥇
                  </div>
                  <div className="rounded-2xl p-5 w-44 border-2 border-yellow-500/50"
                    style={{ background: "linear-gradient(145deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))", backdropFilter: "blur(10px)" }}>
                    <div className="text-white font-black truncate text-sm font-display">{formatAddress(leaders[0].walletAddress || leaders[0].address)}</div>
                    <div className="text-4xl font-black text-yellow-400 font-display">{leaders[0].wins ?? leaders[0].stats?.wins ?? 0}</div>
                    <div className="text-xs text-yellow-300 font-bold">wins</div>
                  </div>
                  <div className="h-28 rounded-t-xl mt-2" style={{ background: "linear-gradient(180deg, #FFD700, #FFA500)" }} />
                </div>
              )}

              {/* 3rd Place */}
              {leaders[2] && (
                <div className="text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <div className="w-24 h-24 mx-auto mb-3 rounded-full flex items-center justify-center text-5xl shadow-xl border-4 border-orange-700"
                    style={{ background: "linear-gradient(135deg, #CD7F32, #8B4513)" }}>
                    🥉
                  </div>
                  <div className="rounded-2xl p-4 w-36 border-2 border-orange-700/50"
                    style={{ background: "linear-gradient(145deg, rgba(205,127,50,0.2), rgba(139,69,19,0.1))", backdropFilter: "blur(10px)" }}>
                    <div className="text-white font-black truncate text-sm font-display">{formatAddress(leaders[2].walletAddress || leaders[2].address)}</div>
                    <div className="text-3xl font-black text-orange-400 font-display">{leaders[2].wins ?? leaders[2].stats?.wins ?? 0}</div>
                    <div className="text-xs text-orange-300 font-bold">wins</div>
                  </div>
                  <div className="h-14 rounded-t-xl mt-2" style={{ background: "linear-gradient(180deg, #CD7F32, #8B4513)" }} />
                </div>
              )}
            </div>

            {/* Full List */}
            <div className="rounded-2xl overflow-hidden border-2 border-white/10"
              style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", backdropFilter: "blur(20px)" }}>

              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 text-white/60 text-sm font-bold border-b border-white/10" style={{ background: "rgba(0,0,0,0.3)" }}>
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-2 text-center">Wins</div>
                <div className="col-span-2 text-center">Losses</div>
                <div className="col-span-2 text-center">Win Rate</div>
              </div>

              {/* Rows */}
              {leaders.map((player, idx) => {
                const rank = idx + 1;
                const playerAddr = player.walletAddress || player.address;
                const isMe = user?.address?.toLowerCase() === playerAddr?.toLowerCase();
                const wins = player.wins ?? player.stats?.wins ?? 0;
                const losses = player.losses ?? player.stats?.losses ?? 0;
                const winRate = getWinRate(wins, losses);

                return (
                  <div
                    key={playerAddr || idx}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all duration-300 ${isMe ? "bg-yellow-500/20 border-l-4 border-yellow-500" : "hover:bg-white/5"
                      }`}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)", animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="col-span-1">
                      {rank <= 3 ? (
                        <span className="text-2xl">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="text-white/60 font-black font-display">#{rank}</span>
                      )}
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm"
                        style={{ background: `linear-gradient(135deg, ${isMe ? '#FFD700' : '#6366F1'}, ${isMe ? '#FFA500' : '#8B5CF6'})` }}>
                        {(playerAddr || "?")[2]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className={`font-bold ${isMe ? "text-yellow-400" : "text-white"}`}>
                          {formatAddress(playerAddr)}
                          {isMe && <span className="ml-2 text-xs text-yellow-300">(You)</span>}
                        </div>
                        <div className="text-xs text-white/40">
                          🪙 {player.coins || 0} coins
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-green-400 font-black text-lg font-display">{wins}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-red-400 font-black text-lg font-display">{losses}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                            style={{ width: `${winRate}%` }} />
                        </div>
                        <span className="text-white/80 font-bold text-sm">{winRate}%</span>
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
          <Link to="/hub">
            <button className="px-8 py-4 font-bold text-white rounded-2xl transition-all hover:scale-105 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 shadow-xl border-2 border-yellow-400/50 font-display">
              ← Back to Hub
            </button>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(15px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
