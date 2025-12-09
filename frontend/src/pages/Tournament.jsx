import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";

const TOURNAMENT_PRIZES = { first: "60%", second: "25%", third: "15%" };

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: `${3 + (i % 3) * 2}px`, height: `${3 + (i % 3) * 2}px`,
            left: `${(i * 7) % 100}%`, top: `${(i * 11) % 100}%`,
            background: i % 2 === 0 ? '#FF00FF' : '#FFD700',
            opacity: 0.3,
            animation: `particle-float ${5 + (i % 3)}s ease-in-out infinite ${i * 0.4}s`
          }}
        />
      ))}
    </div>
  );
}

export default function Tournament() {
  const { user } = useAuth();
  const { contracts, isConnected, connect, isCorrectChain, switchToMantleNetwork } = useWeb3();
  const navigate = useNavigate();

  const [activeTournament, setActiveTournament] = useState(null);
  const [pastTournaments, setPastTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [brackets, setBrackets] = useState([]);
  const [activeTab, setActiveTab] = useState("current");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { setIsLoaded(true); }, []);

  const loadBrackets = async (tournamentId) => {
    try {
      const mockBrackets = [
        { round: "Quarterfinals", matches: [{ player1: "0x1234...5678", player2: "0x8765...4321", winner: null }, { player1: "0xABCD...EFGH", player2: "0xIJKL...MNOP", winner: null }] },
        { round: "Semifinals", matches: [{ player1: "TBD", player2: "TBD", winner: null }] },
        { round: "Finals", matches: [{ player1: "TBD", player2: "TBD", winner: null }] }
      ];
      setBrackets(mockBrackets);
    } catch (error) {
      console.error('Error loading brackets:', error);
    }
  };

  useEffect(() => {
    const loadActiveTournament = async () => {
      if (!contracts?.tournament) return;
      setLoading(true);
      try {
        const tournamentId = await contracts.tournament.currentTournamentId();
        if (tournamentId > 0) {
          const entryFee = await contracts.tournament.entryFee();
          const prizePool = await contracts.tournament.prizePool();
          const participants = await contracts.tournament.getParticipants(tournamentId);
          const startTime = await contracts.tournament.tournamentStartTime();
          const hasStarted = await contracts.tournament.hasStarted();

          setActiveTournament({
            id: Number(tournamentId),
            entryFee: (Number(entryFee) / 1e18).toFixed(2),
            prizePool: (Number(prizePool) / 1e18).toFixed(2),
            participants: participants.length,
            maxParticipants: 8,
            startTime: new Date(Number(startTime) * 1000),
            hasStarted
          });

          if (user?.address) {
            const registered = participants.some(addr => addr.toLowerCase() === user.address.toLowerCase());
            setIsRegistered(registered);
          }
          if (hasStarted) loadBrackets(tournamentId);
        } else {
          setActiveTournament(null);
        }
      } catch (error) {
        console.error('Error loading tournament:', error);
      } finally {
        setLoading(false);
      }
    };
    loadActiveTournament();
  }, [contracts, user?.address]);

  useEffect(() => {
    const loadPastTournaments = async () => {
      if (!contracts?.tournament) return;
      try {
        const mockPast = [
          { id: 1, date: "2024-01-15", winner: "0x1234...5678", prize: "600", participants: 8 },
          { id: 2, date: "2024-01-22", winner: "0xABCD...EFGH", prize: "750", participants: 8 }
        ];
        setPastTournaments(mockPast);
      } catch (error) {
        console.error('Error loading past tournaments:', error);
      }
    };
    loadPastTournaments();
  }, [contracts]);

  const handleRegister = async () => {
    if (!isConnected) { await connect(); return; }
    if (!isCorrectChain) { await switchToMantleNetwork(); return; }
    if (!activeTournament) { setMessage({ type: "error", text: "No active tournament" }); return; }

    try {
      setMessage({ type: "info", text: "Registering..." });
      const entryFeeInWei = BigInt(parseFloat(activeTournament.entryFee) * 1e18);
      const approveTx = await contracts.token.approve(await contracts.tournament.getAddress(), entryFeeInWei);
      await approveTx.wait();
      const registerTx = await contracts.tournament.registerForTournament();
      await registerTx.wait();
      setMessage({ type: "success", text: "🎉 Registered!" });
      setIsRegistered(true);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ type: "error", text: error.message || "Failed" });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)" }}>

      <ParticleBackground />

      {/* Animated glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full filter blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-600 rounded-full filter blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className={`max-w-7xl mx-auto px-4 py-8 relative z-10 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-black mb-4 font-display text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600"
            style={{ textShadow: "0 0 60px rgba(236, 72, 153, 0.4)" }}>
            🏆 ARENA WAR
          </h1>
          <p className="text-pink-300/80 text-lg font-semibold">Compete for Glory & Prizes!</p>
        </div>

        {/* Message toast */}
        {message && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl border-2 font-bold shadow-2xl animate-bounce-in flex items-center gap-3 backdrop-blur-lg ${message.type === "success" ? "bg-green-500/90 border-green-400"
              : message.type === "error" ? "bg-red-500/90 border-red-400"
                : "bg-blue-500/90 border-blue-400"
            } text-white`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-2">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 justify-center flex-wrap">
          {[
            { id: "current", label: "⚔️ Current", icon: "⚔️" },
            { id: "past", label: "📜 Past", icon: "📜" },
            { id: "champions", label: "👑 Champions", icon: "👑" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30 scale-105 border-2 border-purple-400"
                  : "bg-white/5 text-purple-300 hover:bg-white/10 border-2 border-white/10"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Current Tournament Tab */}
        {activeTab === "current" && (
          <div>
            {loading ? (
              <div className="text-center py-20 text-purple-300 text-xl font-bold">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                Loading tournament...
              </div>
            ) : activeTournament ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tournament Info */}
                <div className="lg:col-span-2 rounded-2xl p-8 border-2 border-white/10 overflow-hidden"
                  style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", backdropFilter: "blur(20px)" }}>
                  <h2 className="text-3xl font-black text-white mb-6 font-display">
                    ⚔️ Weekly Tournament #{activeTournament.id}
                  </h2>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: "Entry Fee", value: `${activeTournament.entryFee} 💎`, icon: "💰" },
                      { label: "Prize Pool", value: `${activeTournament.prizePool} 💎`, icon: "🏆" },
                      { label: "Participants", value: `${activeTournament.participants}/${activeTournament.maxParticipants}`, icon: "👥" },
                      { label: "Status", value: activeTournament.hasStarted ? "🔴 IN PROGRESS" : "🟢 OPEN", icon: "📊" }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="text-purple-300/70 text-sm font-bold mb-1">{stat.label}</div>
                        <div className="text-white text-xl font-black font-display">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Prize Distribution */}
                  <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/30 mb-6">
                    <h3 className="text-xl font-black text-yellow-400 mb-4 font-display">💰 Prize Distribution</h3>
                    <div className="space-y-2">
                      {[
                        { place: "1st", icon: "🥇", prize: TOURNAMENT_PRIZES.first, color: "text-yellow-400" },
                        { place: "2nd", icon: "🥈", prize: TOURNAMENT_PRIZES.second, color: "text-gray-300" },
                        { place: "3rd", icon: "🥉", prize: TOURNAMENT_PRIZES.third, color: "text-orange-400" }
                      ].map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{p.icon}</span>
                            <span className="text-white font-bold">{p.place} Place</span>
                          </div>
                          <span className={`${p.color} font-black text-xl font-display`}>{p.prize}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  {!activeTournament.hasStarted && (
                    <div>
                      {isRegistered ? (
                        <div className="bg-green-500/20 border-2 border-green-500/50 rounded-xl p-6 text-center">
                          <div className="text-4xl mb-3">✅</div>
                          <div className="text-green-400 font-black text-xl font-display">You're Registered!</div>
                          <div className="text-green-300/70 text-sm mt-2">Tournament starts when full</div>
                        </div>
                      ) : (
                        <button
                          onClick={handleRegister}
                          disabled={activeTournament.participants >= activeTournament.maxParticipants}
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black text-xl hover:from-purple-400 hover:to-pink-500 transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-400/50"
                        >
                          {activeTournament.participants >= activeTournament.maxParticipants
                            ? "🔒 TOURNAMENT FULL"
                            : `⚔️ REGISTER (${activeTournament.entryFee} ARENA)`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Rules sidebar */}
                <div className="rounded-2xl p-8 border-2 border-white/10"
                  style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", backdropFilter: "blur(20px)" }}>
                  <h2 className="text-2xl font-black text-white mb-6 font-display">📜 Rules</h2>

                  <div className="space-y-4">
                    {[
                      { icon: "🎯", title: "Format", desc: "Single elimination, best of 1" },
                      { icon: "👥", title: "Players", desc: "8 participants maximum" },
                      { icon: "⏰", title: "Schedule", desc: "Starts when full or after 24h" },
                      { icon: "🏆", title: "Prizes", desc: "60% / 25% / 15% split" },
                      { icon: "✨", title: "Bonus", desc: "Champion gets exclusive NFT badge!" }
                    ].map((rule, i) => (
                      <div key={i}>
                        <div className="font-black text-white mb-1 flex items-center gap-2">
                          <span>{rule.icon}</span> {rule.title}
                        </div>
                        <div className="text-purple-300/70 text-sm">{rule.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-2xl font-black text-white mb-2 font-display">No Active Tournament</h3>
                <p className="text-purple-300/70">Check back soon!</p>
              </div>
            )}
          </div>
        )}

        {/* Past Tab */}
        {activeTab === "past" && (
          <div className="rounded-2xl p-8 border-2 border-white/10"
            style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", backdropFilter: "blur(20px)" }}>
            <h2 className="text-3xl font-black text-white mb-6 font-display">📜 Tournament History</h2>

            {pastTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-black text-white mb-2">No Past Tournaments</h3>
                <p className="text-purple-300/70">History will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastTournaments.map(t => (
                  <div key={t.id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-black text-white mb-1 font-display">Tournament #{t.id}</div>
                        <div className="text-purple-300/70 text-sm">{t.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-black text-lg mb-1">🥇 {t.winner}</div>
                        <div className="text-purple-300/70 text-sm">Prize: {t.prize} ARENA</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Champions Tab */}
        {activeTab === "champions" && (
          <div className="rounded-2xl p-8 border-2 border-white/10"
            style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", backdropFilter: "blur(20px)" }}>
            <h2 className="text-3xl font-black text-white mb-6 font-display">👑 Hall of Champions</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: "🥇", title: "Most Wins", player: "0x1234...5678", stat: "5 Tournaments Won", gradient: "from-yellow-500/20 to-yellow-600/10", border: "border-yellow-500/50", color: "text-yellow-400" },
                { icon: "💎", title: "Highest Earnings", player: "0xABCD...EFGH", stat: "2,500 ARENA", gradient: "from-purple-500/20 to-pink-500/10", border: "border-purple-500/50", color: "text-purple-400" },
                { icon: "⚡", title: "Win Streak", player: "0xIJKL...MNOP", stat: "3 in a Row", gradient: "from-cyan-500/20 to-blue-500/10", border: "border-cyan-500/50", color: "text-cyan-400" }
              ].map((champ, i) => (
                <div key={i} className={`bg-gradient-to-br ${champ.gradient} rounded-xl p-6 border-2 ${champ.border} text-center transition-all hover:scale-105`}>
                  <div className="text-5xl mb-3">{champ.icon}</div>
                  <div className={`${champ.color} font-black text-xl mb-2 font-display`}>{champ.title}</div>
                  <div className="text-white text-sm">{champ.player}</div>
                  <div className="text-white/60 text-xs mt-2">{champ.stat}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="text-center mt-12">
          <Link to="/hub">
            <button className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:from-purple-400 hover:to-pink-500 transition shadow-xl border-2 border-purple-400/50 hover:scale-105">
              ← Back to Hub
            </button>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-40px) translateX(20px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
