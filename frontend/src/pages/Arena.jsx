// src/pages/Arena.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import PhaserArena from "../components/PhaserArena";

// Get user from localStorage or window - called dynamically
function getCurrentUser() {
  // First try localStorage (ConnectWallet flow)
  const token = localStorage.getItem("duelcraft_jwt");
  const addr = localStorage.getItem("duelcraft_address");
  if (addr) {
    return { address: addr, token: token || null };
  }
  // Fallback to window.currentUser (AuthContext flow)
  if (window.currentUser?.address) {
    return { address: window.currentUser.address, token: null };
  }
  return null;
}

export default function Arena() {
  const location = useLocation();
  const wsRef = useRef(null);
  const reconnectRef = useRef(0);
  const [status, setStatus] = useState("disconnected");
  const [inQueue, setInQueue] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Cash Duel mode detection
  const searchParams = new URLSearchParams(location.search);
  const isCashDuel = searchParams.get('cashDuel') === 'true';
  const duelId = searchParams.get('duelId');
  const tierIndex = searchParams.get('tier');
  
  // Handle cash duel completion
  const handleCashDuelComplete = async (winnerId, battleData) => {
    try {
      console.log('[Arena] Completing cash duel:', duelId);
      
      // Get winner's address from window.currentMatch
      let winnerAddress;
      const myId = window.currentMatch?.playerId;
      
      if (myId === winnerId) {
        // Current user won
        winnerAddress = user?.address;
      } else {
        // Opponent won - find opponent's address from players data
        const players = window.currentMatch?.players;
        if (players) {
          // Find the player that's not us
          const opponentId = Object.keys(players).find(id => id !== myId);
          if (opponentId && players[opponentId]?.profile?.address) {
            winnerAddress = players[opponentId].profile.address;
          }
        }
      }
      
      if (!winnerAddress) {
        console.error('[Arena] Could not determine winner address');
        return;
      }
      
      const response = await fetch('http://localhost:4000/api/cash-duel/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          winnerAddress,
          battleData: {
            winner: winnerId,
            loser: battleData.loser,
            reason: battleData.reason
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('[Arena] Cash duel completed! TX:', result.transactionHash);
        console.log('[Arena] Winner received:', result.winnerAmount, 'MNT');
      } else {
        console.error('[Arena] Failed to complete cash duel:', result.error);
      }
    } catch (error) {
      console.error('[Arena] Error completing cash duel:', error);
    }
  };
  
  // Load user on mount and listen for storage changes
  useEffect(() => {
    const loadUser = () => {
      const u = getCurrentUser();
      if (u) {
        console.log("[Arena] User loaded:", u.address);
        setUser(u);
      } else {
        console.log("[Arena] No user found yet");
      }
    };
    
    loadUser();
    
    // Listen for storage changes (in case login happens in another tab/component)
    window.addEventListener("storage", loadUser);
    
    // Also poll a couple times in case localStorage is set after mount
    const t1 = setTimeout(loadUser, 500);
    const t2 = setTimeout(loadUser, 1500);
    
    return () => {
      window.removeEventListener("storage", loadUser);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Set window.currentUser on mount
  useEffect(() => {
    if (user) {
      window.currentUser = user;
    }
    return () => {
      if (window.currentUser) delete window.currentUser;
    };
  }, [user]);

  // Fetch profile when user is set
  useEffect(() => {
    async function loadProfile() {
      if (user?.address) {
        try {
          const res = await fetch(`http://localhost:4000/profile?address=${user.address}`);
          const data = await res.json();
          const profile = {};
          if (data?.avatar) {
            profile.avatar = data.avatar;
          }
          if (data?.equipped) {
            profile.equipped = data.equipped;
          }
          if (data?.selectedCharacter) {
            profile.selectedCharacter = data.selectedCharacter;
            // Map character ID to image path
            const characterImages = {
              'char_warrior': '/characters/warrior.png',
              'char_mage': '/characters/mage.png',
              'char_rogue': '/characters/rogue.png',
              'char_tank': '/characters/tank.png',
              'char_archer': '/characters/archer.png',
              'char_assassin': '/characters/assassin.png'
            };
            profile.characterImage = characterImages[data.selectedCharacter];
            console.log('[Arena] Selected character:', data.selectedCharacter, 'Image:', profile.characterImage);
          }
          console.log('[Arena] Setting user profile:', profile);
          setUserProfile(profile);
          if (data?.coins !== undefined) {
            setCoins(data.coins);
          }
        } catch (err) {
          console.warn("Failed to fetch profile:", err);
        }
      }
    }
    loadProfile();
  }, [user]);

  // Refresh coins after match
  useEffect(() => {
    if (matchResult && user?.address) {
      fetch(`http://localhost:4000/profile?address=${user.address}`)
        .then(res => res.json())
        .then(data => {
          if (data?.coins !== undefined) setCoins(data.coins);
        })
        .catch(() => {});
    }
  }, [matchResult, user?.address]);

  // Auto-join cash duel queue when ready (only once)
  const hasAutoJoinedRef = useRef(false);
  
  useEffect(() => {
    if (isCashDuel && duelId && status === 'connected' && user?.address && userProfile && !inQueue && !currentMatch && !hasAutoJoinedRef.current) {
      console.log('[Arena] Auto-joining cash duel queue, duelId:', duelId);
      hasAutoJoinedRef.current = true; // Prevent re-joining
      
      const payload = {
        type: "join_queue",
        mode: "cash_duel",
        duelId: duelId,
        auth: { 
          address: user.address, 
          token: user.token || null 
        },
        profile: userProfile || {}
      };
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        setInQueue(true);
      }
    }
  }, [isCashDuel, duelId, status, user, userProfile, inQueue, currentMatch]);

  // Safe send helper
  const safeSend = useCallback((obj) => {
    const sock = wsRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return false;
    try {
      sock.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }, []);

  // Attach auth to payload
  const attachAuthPayload = useCallback((payload) => {
    if (user?.address) {
      payload.auth = { address: user.address, token: user.token || null };
      if (userProfile?.avatar) {
        payload.profile = { avatar: userProfile.avatar };
      }
      console.log("[Arena] Attached auth to payload:", payload.auth);
    } else {
      console.log("[Arena] WARNING: No user address to attach!");
    }
    return payload;
  }, [user, userProfile]);

  // WebSocket connection
  useEffect(() => {
    function connect() {
      if (wsRef.current) return;

      setStatus("connecting");
      const socket = new WebSocket("ws://localhost:4000/ws");

      socket.onopen = () => {
        reconnectRef.current = 0;
        wsRef.current = socket;
        setStatus("connected");
      };

      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);

          if (data.type === "match_start") {
            console.log('[Arena] Match start received:', data);
            console.log('[Arena] Players data:', data.players);
            setCurrentMatch(data);
            setInQueue(false);
            window.currentMatch = data;
          } else if (data.type === "match_end") {
            const myId = window.currentMatch?.playerId;
            const won = data.winner === myId;
            const coinsEarned = won ? data.rewards?.winner?.coins : data.rewards?.loser?.coins;
            
            // Handle Cash Duel completion
            if (isCashDuel && duelId) {
              console.log('[Arena] Cash Duel ended, winner:', data.winner);
              handleCashDuelComplete(data.winner, data);
              
              // For cash duels, show special result with MNT earnings
              setMatchResult({
                won,
                coinsEarned: 0, // Don't show regular coins for cash duels
                reason: data.reason,
                isCashDuel: true,
                duelId: duelId,
                tier: parseInt(tierIndex)
              });
            } else {
              // Regular match
              setMatchResult({
                won,
                coinsEarned: coinsEarned || 0,
                reason: data.reason,
                isCashDuel: false
              });
            }
            
            setCurrentMatch(null);
            setInQueue(false);
            if (window.currentMatch) delete window.currentMatch;
          } else if (data.type === "state") {
            if (typeof window.handleServerState === "function") {
              try {
                window.handleServerState(data);
              } catch { /* ignore render errors */ }
            }
          }
        } catch { /* ignore parse errors */ }
      };

      socket.onclose = () => {
        wsRef.current = null;
        setStatus("disconnected");
        setCurrentMatch(null);
        if (window.currentMatch) delete window.currentMatch;

        reconnectRef.current++;
        const delay = Math.min(5000, 500 * Math.pow(1.8, reconnectRef.current));
        setTimeout(connect, delay);
      };

      socket.onerror = () => { /* handled by onclose */ };
    }

    connect();

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
      if (window.sendInput) delete window.sendInput;
      if (window.handleServerState) delete window.handleServerState;
      if (window.currentMatch) delete window.currentMatch;
    };
  }, []);

  // Expose sendInput globally for Phaser
  useEffect(() => {
    window.sendInput = (payload) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;
      try {
        wsRef.current.send(JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    };
    return () => {
      if (window.sendInput) delete window.sendInput;
    };
  }, []);

  // Join queue - get fresh user data right before joining
  function joinQueue() {
    if (inQueue || currentMatch || status !== "connected") return;
    
    // Get fresh user data from localStorage
    const freshUser = getCurrentUser();
    const userAddr = freshUser?.address || user?.address;
    
    if (!userAddr) {
      console.error("[Arena] Cannot join queue - no wallet address!");
      alert("Please connect your wallet first!");
      return;
    }
    
    const payload = {
      type: "join_queue",
      auth: { 
        address: userAddr, 
        token: freshUser?.token || user?.token || null 
      },
      profile: userProfile || {}
    };
    
    console.log("[Arena] Joining queue with payload:", JSON.stringify(payload));
    console.log("[Arena] Profile selectedCharacter:", payload.profile?.selectedCharacter);
    console.log("[Arena] Profile characterImage:", payload.profile?.characterImage);
    
    if (safeSend(payload)) {
      setInQueue(true);
    }
  }

  // Leave queue
  function leaveQueue() {
    if (!inQueue) return;
    safeSend(attachAuthPayload({ type: "leave_queue" }));
    setInQueue(false);
  }

  return (
    <div 
      className="h-screen w-screen fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/landingpage/Arenaa.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20" />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        {/* Match Result Modal */}
        {matchResult && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div 
              className="p-10 rounded-2xl text-center text-white shadow-2xl max-w-lg"
              style={{
                background: matchResult.won 
                  ? "linear-gradient(135deg, #22c55e, #16a34a)" 
                  : "linear-gradient(135deg, #ef4444, #dc2626)"
              }}
            >
              <div className="text-6xl mb-4">{matchResult.won ? "🏆" : "💀"}</div>
              <h2 className="text-4xl font-black mb-2">
                {matchResult.won ? "VICTORY!" : "DEFEAT"}
              </h2>
              <p className="text-lg opacity-90 mb-6">
                {matchResult.reason === "forfeit" 
                  ? "Opponent forfeited" 
                  : matchResult.won 
                    ? "You knocked out your opponent!" 
                    : "You were knocked out!"}
              </p>
              
              {/* Cash Duel Earnings Breakdown */}
              {matchResult.isCashDuel ? (
                <div className="bg-black/30 rounded-xl p-6 mb-6 text-left">
                  <h3 className="text-2xl font-bold text-center mb-4 text-yellow-300">
                    💎 CASH DUEL RESULTS
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-gray-200">Tier:</span>
                      <span className="font-bold text-white">
                        {['🥉 BRONZE', '🥈 SILVER', '🥇 GOLD'][matchResult.tier || 0]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-gray-200">Your Entry:</span>
                      <span className="font-bold text-red-300">
                        -{[2, 10, 20][matchResult.tier || 0]} MNT
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-gray-200">Prize Pool:</span>
                      <span className="font-bold text-blue-300">
                        {[4, 20, 40][matchResult.tier || 0]} MNT
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-gray-200">Platform Fee (10%):</span>
                      <span className="font-bold text-orange-300">
                        -{[0.4, 2, 4][matchResult.tier || 0]} MNT
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xl font-bold">
                        {matchResult.won ? 'YOU WON:' : 'YOU LOST:'}
                      </span>
                      <span className="text-3xl font-black text-yellow-300">
                        {matchResult.won 
                          ? `+${[1.6, 8, 16][matchResult.tier || 0]} MNT` 
                          : `-${[2, 10, 20][matchResult.tier || 0]} MNT`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/20 px-6 py-3 rounded-lg mb-6 inline-block">
                  <span className="text-2xl">💰 +{matchResult.coinsEarned} coins</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  setMatchResult(null);
                  if (matchResult.isCashDuel) {
                    // Redirect to Hub after cash duel
                    window.location.href = '/hub';
                  }
                }}
                className="px-8 py-3 bg-white text-gray-800 font-bold rounded-lg hover:bg-gray-100 transition"
              >
                {matchResult.isCashDuel ? '← Back to Hub' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Not in match - Show queue UI */}
        {!currentMatch && (
          <div className="text-center">
            {/* Status indicator */}
            <div className="mb-6">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-base font-bold border-2 shadow-lg ${
                status === "connected" ? "bg-green-500/30 text-green-300 border-green-500" :
                status === "connecting" ? "bg-yellow-500/30 text-yellow-300 border-yellow-500" :
                "bg-red-500/30 text-red-300 border-red-500"
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  status === "connected" ? "bg-green-300 shadow-[0_0_10px_rgba(134,239,172,0.8)]" :
                  status === "connecting" ? "bg-yellow-300 animate-pulse shadow-[0_0_10px_rgba(253,224,71,0.8)]" :
                  "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)]"
                }`} />
                {status === "connected" ? "● Connected" : status === "connecting" ? "● Connecting..." : "● Disconnected"}
              </div>
            </div>

            {/* Coins display */}
            {user && (
              <div className="mb-6 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-600/40 to-amber-600/40 rounded-2xl border-2 border-yellow-500 shadow-lg">
                <span className="text-2xl drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">🪙</span>
                <span className="text-yellow-300 font-black text-lg">{coins} coins</span>
              </div>
            )}

            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4 tracking-wider drop-shadow-2xl">⚔️ ARENA ⚔️</h1>
            <p className="text-gray-300 font-bold text-xl mb-8">Find an opponent and battle!</p>

            {!user ? (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-400">Please connect your wallet first</p>
                <Link to="/hub" className="text-red-300 underline text-sm">Go to Hub</Link>
              </div>
            ) : inQueue ? (
              <div className="space-y-6 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-3xl p-12 border-4 border-yellow-500/50 shadow-2xl">
                {/* Searching animation */}
                <div className="relative">
                  <div className="w-40 h-40 mx-auto relative">
                    {/* Outer ring */}
                    <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full"></div>
                    {/* Spinning ring */}
                    <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
                    {/* Inner pulse */}
                    <div className="absolute inset-4 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full animate-pulse"></div>
                    {/* Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl drop-shadow-[0_0_20px_rgba(251,146,60,0.8)]">⚔️</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-3 tracking-wider">SEARCHING...</h3>
                  <p className="text-orange-400 font-bold text-lg">Looking for a worthy opponent</p>
                </div>
                
                <button
                  onClick={leaveQueue}
                  className="relative px-10 py-4 bg-gradient-to-br from-red-600 via-red-700 to-red-900 hover:from-red-500 hover:via-red-600 hover:to-red-800 text-white font-black rounded-2xl transition-all transform hover:scale-110 shadow-2xl border-4 border-red-900"
                >
                  <span className="relative z-10 flex items-center gap-2 text-xl">✕ Cancel Search</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-2xl"></div>
                </button>
              </div>
            ) : (
              <div className="space-y-6 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-3xl p-8 border-4 border-blue-500/30 shadow-2xl">
                <button
                  onClick={joinQueue}
                  disabled={status !== "connected"}
                  className="relative px-12 py-5 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-white font-black rounded-2xl transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-2xl border-4 border-orange-700 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <span className="relative z-10 flex items-center gap-3 text-2xl tracking-wider">
                    🎮 FIND MATCH
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity"></div>
                </button>
                
                <div className="text-gray-400 text-lg font-bold">or</div>
                
                <button
                  onClick={() => {
                    // Send join_ai message to play against bot
                    safeSend(attachAuthPayload({ type: "join_ai" }));
                  }}
                  disabled={status !== "connected"}
                  className="relative px-10 py-4 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white font-black rounded-2xl transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-2xl border-4 border-blue-800 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <span className="relative z-10 flex items-center gap-3 text-xl tracking-wide">
                    🤖 FIGHT AI (Test)
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity"></div>
                </button>
              </div>
            )}

            <div className="mt-8">
              <Link 
                to="/hub" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg border-2 border-gray-600"
              >
                <span className="text-xl">←</span>
                <span>Back to Hub</span>
              </Link>
            </div>
          </div>
        )}

        {/* In match - Show game FULLSCREEN */}
        {currentMatch && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex-1 w-full h-full">
              <div id="phaser-container" className="w-full h-full">
                <PhaserArena match={currentMatch} />
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
              <button
                onClick={() => {
                  safeSend(attachAuthPayload({ type: "forfeit", matchId: currentMatch.matchId }));
                  setCurrentMatch(null);
                  if (window.currentMatch) delete window.currentMatch;
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
              >
                Forfeit Match
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
