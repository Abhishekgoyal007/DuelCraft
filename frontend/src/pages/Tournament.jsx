import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import Navbar from "../components/Navbar";

const TOURNAMENT_PRIZES = {
  first: "60%",
  second: "25%",
  third: "15%"
};

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
  const [activeTab, setActiveTab] = useState("current"); // current, past, champions
  
  // Load tournament brackets
  const loadBrackets = async (tournamentId) => {
    try {
      // Fetch match data from contract
      // For now, using mock data structure
      const mockBrackets = [
        {
          round: "Quarterfinals",
          matches: [
            { player1: "0x1234...5678", player2: "0x8765...4321", winner: null },
            { player1: "0xABCD...EFGH", player2: "0xIJKL...MNOP", winner: null }
          ]
        },
        {
          round: "Semifinals",
          matches: [
            { player1: "TBD", player2: "TBD", winner: null }
          ]
        },
        {
          round: "Finals",
          matches: [
            { player1: "TBD", player2: "TBD", winner: null }
          ]
        }
      ];
      
      setBrackets(mockBrackets);
    } catch (error) {
      console.error('Error loading brackets:', error);
    }
  };
  
  // Load active tournament
  useEffect(() => {
    const loadActiveTournament = async () => {
      if (!contracts?.tournament) return;
      
      setLoading(true);
      try {
        // Check if there's an active tournament
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
            maxParticipants: 8, // From contract
            startTime: new Date(Number(startTime) * 1000),
            hasStarted
          });
          
          // Check if user is registered
          if (user?.address) {
            const registered = participants.some(
              addr => addr.toLowerCase() === user.address.toLowerCase()
            );
            setIsRegistered(registered);
          }
          
          // Load brackets if tournament has started
          if (hasStarted) {
            loadBrackets(tournamentId);
          }
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
  }, [contracts, user?.address, loadBrackets]);

  // Load past tournaments
  useEffect(() => {
    const loadPastTournaments = async () => {
      if (!contracts?.tournament) return;
      
      try {
        // Fetch completed tournaments
        // For now, using mock data
        const mockPast = [
          {
            id: 1,
            date: "2024-01-15",
            winner: "0x1234...5678",
            prize: "600",
            participants: 8
          },
          {
            id: 2,
            date: "2024-01-22",
            winner: "0xABCD...EFGH",
            prize: "750",
            participants: 8
          }
        ];
        
        setPastTournaments(mockPast);
      } catch (error) {
        console.error('Error loading past tournaments:', error);
      }
    };
    
    loadPastTournaments();
  }, [contracts]);

  const handleRegister = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (!isCorrectChain) {
      await switchToMantleNetwork();
      return;
    }

    if (!activeTournament) {
      setMessage({ type: "error", text: "No active tournament" });
      return;
    }

    try {
      setMessage({ type: "info", text: "Processing registration..." });
      
      // Approve ARENA tokens for entry fee
      const entryFeeInWei = BigInt(parseFloat(activeTournament.entryFee) * 1e18);
      const approveTx = await contracts.token.approve(
        await contracts.tournament.getAddress(),
        entryFeeInWei
      );
      await approveTx.wait();

      // Register for tournament
      const registerTx = await contracts.tournament.registerForTournament();
      await registerTx.wait();

      setMessage({ 
        type: "success", 
        text: "🎉 Successfully registered for tournament!" 
      });
      
      setIsRegistered(true);
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ 
        type: "error", 
        text: error.message || "Registration failed" 
      });
    }
  };

  const handleStartTournament = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (!isCorrectChain) {
      await switchToMantleNetwork();
      return;
    }

    try {
      setMessage({ type: "info", text: "Starting tournament..." });
      
      const startTx = await contracts.tournament.startTournament();
      await startTx.wait();

      setMessage({ 
        type: "success", 
        text: "🏁 Tournament started! Good luck!" 
      });
      
      setTimeout(() => {
        setMessage(null);
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Start tournament error:', error);
      setMessage({ 
        type: "error", 
        text: error.message || "Failed to start tournament" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-pink-900 relative overflow-hidden">
      <Navbar />
      
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-400 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-400 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-6xl font-black mb-4"
            style={{
              textShadow: "4px 4px 0 #000",
              color: "#FF00FF"
            }}
          >
            🏆 TOURNAMENTS
          </h1>
          <p className="text-pink-200 text-lg font-bold">Compete for Glory & Prizes!</p>
        </div>

        {/* Message notification */}
        {message && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-5 rounded-2xl border-4 font-black text-lg shadow-2xl ${
            message.type === "success" 
              ? "bg-green-500 border-green-600 text-white" 
              : message.type === "error" 
                ? "bg-red-500 border-red-600 text-white" 
                : "bg-blue-500 border-blue-600 text-white"
          }`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-4">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setActiveTab("current")}
            className={`px-8 py-4 rounded-xl font-black text-lg transition-all ${
              activeTab === "current"
                ? "bg-purple-500 text-white shadow-lg scale-105"
                : "bg-white/10 text-purple-200 hover:bg-white/20"
            }`}
          >
            ⚔️ Current
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-8 py-4 rounded-xl font-black text-lg transition-all ${
              activeTab === "past"
                ? "bg-purple-500 text-white shadow-lg scale-105"
                : "bg-white/10 text-purple-200 hover:bg-white/20"
            }`}
          >
            📜 Past
          </button>
          <button
            onClick={() => setActiveTab("champions")}
            className={`px-8 py-4 rounded-xl font-black text-lg transition-all ${
              activeTab === "champions"
                ? "bg-purple-500 text-white shadow-lg scale-105"
                : "bg-white/10 text-purple-200 hover:bg-white/20"
            }`}
          >
            👑 Champions
          </button>
        </div>

        {/* Current Tournament Tab */}
        {activeTab === "current" && (
          <div>
            {loading ? (
              <div className="text-center py-20 text-purple-200 text-xl font-bold">
                Loading tournament data...
              </div>
            ) : activeTournament ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tournament Info */}
                <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-4 border-white/20">
                  <h2 className="text-3xl font-black text-white mb-6">
                    ⚔️ Weekly Tournament #{activeTournament.id}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-bold mb-1">Entry Fee</div>
                      <div className="text-white text-2xl font-black">{activeTournament.entryFee} 💎</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-bold mb-1">Prize Pool</div>
                      <div className="text-white text-2xl font-black">{activeTournament.prizePool} 💎</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-bold mb-1">Participants</div>
                      <div className="text-white text-2xl font-black">
                        {activeTournament.participants}/{activeTournament.maxParticipants}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-bold mb-1">Status</div>
                      <div className="text-white text-lg font-black">
                        {activeTournament.hasStarted ? "🔴 IN PROGRESS" : "🟢 OPEN"}
                      </div>
                    </div>
                  </div>

                  {/* Prize Distribution */}
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border-2 border-yellow-500/50 mb-6">
                    <h3 className="text-xl font-black text-yellow-300 mb-4">💰 Prize Distribution</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">🥇</span>
                          <span className="text-white font-bold">1st Place</span>
                        </div>
                        <span className="text-yellow-300 font-black text-xl">{TOURNAMENT_PRIZES.first}</span>
                      </div>
                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">🥈</span>
                          <span className="text-white font-bold">2nd Place</span>
                        </div>
                        <span className="text-gray-300 font-black text-xl">{TOURNAMENT_PRIZES.second}</span>
                      </div>
                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">🥉</span>
                          <span className="text-white font-bold">3rd Place</span>
                        </div>
                        <span className="text-orange-300 font-black text-xl">{TOURNAMENT_PRIZES.third}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!activeTournament.hasStarted && (
                    <div>
                      {isRegistered ? (
                        <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center">
                          <div className="text-4xl mb-3">✅</div>
                          <div className="text-green-300 font-black text-xl">You're Registered!</div>
                          <div className="text-green-200 text-sm mt-2">
                            Tournament starts when all slots are filled
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={handleRegister}
                          disabled={activeTournament.participants >= activeTournament.maxParticipants}
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black text-xl hover:from-purple-600 hover:to-pink-700 transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {activeTournament.participants >= activeTournament.maxParticipants 
                            ? "🔒 TOURNAMENT FULL" 
                            : `⚔️ REGISTER (${activeTournament.entryFee} ARENA)`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Brackets */}
                {activeTournament.hasStarted && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-4 border-white/20">
                    <h2 className="text-2xl font-black text-white mb-6">📊 Bracket</h2>
                    
                    <div className="space-y-6">
                      {brackets.map((round, idx) => (
                        <div key={idx}>
                          <div className="text-purple-300 font-black mb-3">{round.round}</div>
                          <div className="space-y-2">
                            {round.matches.map((match, matchIdx) => (
                              <div key={matchIdx} className="bg-white/5 rounded-lg p-3">
                                <div className="text-white text-sm font-bold">{match.player1}</div>
                                <div className="text-purple-300 text-xs my-1">vs</div>
                                <div className="text-white text-sm font-bold">{match.player2}</div>
                                {match.winner && (
                                  <div className="text-green-400 text-xs mt-2 font-bold">
                                    Winner: {match.winner}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rules sidebar when not started */}
                {!activeTournament.hasStarted && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-4 border-white/20">
                    <h2 className="text-2xl font-black text-white mb-6">📜 Rules</h2>
                    
                    <div className="space-y-4 text-purple-200">
                      <div>
                        <div className="font-black text-white mb-1">🎯 Format</div>
                        <div className="text-sm">Single elimination, best of 1</div>
                      </div>
                      
                      <div>
                        <div className="font-black text-white mb-1">👥 Players</div>
                        <div className="text-sm">8 participants maximum</div>
                      </div>
                      
                      <div>
                        <div className="font-black text-white mb-1">⏰ Schedule</div>
                        <div className="text-sm">Starts when full or after 24h</div>
                      </div>
                      
                      <div>
                        <div className="font-black text-white mb-1">🏆 Prizes</div>
                        <div className="text-sm">60% / 25% / 15% split</div>
                      </div>
                      
                      <div>
                        <div className="font-black text-white mb-1">✨ Bonus</div>
                        <div className="text-sm">Champion gets exclusive NFT badge!</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-2xl font-black text-white mb-2">No Active Tournament</h3>
                <p className="text-purple-300 mb-6">Check back soon for the next tournament!</p>
              </div>
            )}
          </div>
        )}

        {/* Past Tournaments Tab */}
        {activeTab === "past" && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-4 border-white/20">
            <h2 className="text-3xl font-black text-white mb-6">📜 Tournament History</h2>
            
            {pastTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-black text-white mb-2">No Past Tournaments</h3>
                <p className="text-purple-300">History will appear here after tournaments conclude</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastTournaments.map(tournament => (
                  <div key={tournament.id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-black text-white mb-1">
                          Tournament #{tournament.id}
                        </div>
                        <div className="text-purple-300 text-sm">{tournament.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-black text-lg mb-1">
                          🥇 {tournament.winner}
                        </div>
                        <div className="text-purple-200 text-sm">
                          Prize: {tournament.prize} ARENA
                        </div>
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
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-4 border-white/20">
            <h2 className="text-3xl font-black text-white mb-6">👑 Hall of Champions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top 3 Champions */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl p-6 border-2 border-yellow-500/50 text-center">
                <div className="text-5xl mb-3">🥇</div>
                <div className="text-yellow-300 font-black text-xl mb-2">Most Wins</div>
                <div className="text-white text-sm">0x1234...5678</div>
                <div className="text-yellow-200 text-xs mt-2">5 Tournaments Won</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border-2 border-purple-500/50 text-center">
                <div className="text-5xl mb-3">💎</div>
                <div className="text-purple-300 font-black text-xl mb-2">Highest Earnings</div>
                <div className="text-white text-sm">0xABCD...EFGH</div>
                <div className="text-purple-200 text-xs mt-2">2,500 ARENA</div>
              </div>
              
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-6 border-2 border-cyan-500/50 text-center">
                <div className="text-5xl mb-3">⚡</div>
                <div className="text-cyan-300 font-black text-xl mb-2">Win Streak</div>
                <div className="text-white text-sm">0xIJKL...MNOP</div>
                <div className="text-cyan-200 text-xs mt-2">3 in a Row</div>
              </div>
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate("/hub")}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black rounded-xl hover:from-purple-600 hover:to-pink-700 transition shadow-xl border-4 border-purple-400"
          >
            ← Back to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
