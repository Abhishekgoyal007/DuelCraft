// src/pages/Arena.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
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
  const wsRef = useRef(null);
  const reconnectRef = useRef(0);
  const [status, setStatus] = useState("disconnected");
  const [inQueue, setInQueue] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
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
            
            setMatchResult({
              won,
              coinsEarned: coinsEarned || 0,
              reason: data.reason
            });
            
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
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)" }}>
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Match Result Modal */}
        {matchResult && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div 
              className="p-10 rounded-2xl text-center text-white shadow-2xl"
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
              <div className="bg-white/20 px-6 py-3 rounded-lg mb-6 inline-block">
                <span className="text-2xl">💰 +{matchResult.coinsEarned} coins</span>
              </div>
              <br />
              <button
                onClick={() => setMatchResult(null)}
                className="px-8 py-3 bg-white text-gray-800 font-bold rounded-lg hover:bg-gray-100 transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Not in match - Show queue UI */}
        {!currentMatch && (
          <div className="text-center">
            {/* Status indicator */}
            <div className="mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                status === "connected" ? "bg-green-500/20 text-green-400" :
                status === "connecting" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  status === "connected" ? "bg-green-400" :
                  status === "connecting" ? "bg-yellow-400 animate-pulse" :
                  "bg-red-400"
                }`} />
                {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Disconnected"}
              </div>
            </div>

            {/* Coins display */}
            {user && (
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-full">
                <span className="text-xl">🪙</span>
                <span className="text-yellow-400 font-bold">{coins} coins</span>
              </div>
            )}

            <h1 className="text-4xl font-black text-white mb-4">⚔️ ARENA ⚔️</h1>
            <p className="text-gray-400 mb-8">Find an opponent and battle!</p>

            {!user ? (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-400">Please connect your wallet first</p>
                <Link to="/hub" className="text-red-300 underline text-sm">Go to Hub</Link>
              </div>
            ) : inQueue ? (
              <div className="space-y-6">
                {/* Searching animation */}
                <div className="relative">
                  <div className="w-32 h-32 mx-auto relative">
                    {/* Outer ring */}
                    <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full"></div>
                    {/* Spinning ring */}
                    <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
                    {/* Inner pulse */}
                    <div className="absolute inset-4 bg-orange-500/20 rounded-full animate-pulse"></div>
                    {/* Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl">⚔️</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-2xl font-black text-white mb-2">SEARCHING...</h3>
                  <p className="text-orange-400 font-medium">Looking for a worthy opponent</p>
                </div>
                
                <button
                  onClick={leaveQueue}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition transform hover:scale-105"
                >
                  ✕ Cancel Search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={joinQueue}
                  disabled={status !== "connected"}
                  className="px-10 py-4 text-xl font-black text-white rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(180deg, #FF6B35 0%, #E74C3C 100%)",
                    border: "4px solid #C0392B",
                    boxShadow: "0 6px 0 #8B0000"
                  }}
                >
                  🎮 FIND MATCH
                </button>
                
                <div className="text-gray-500 text-sm">or</div>
                
                <button
                  onClick={() => {
                    // Send join_ai message to play against bot
                    safeSend(attachAuthPayload({ type: "join_ai" }));
                  }}
                  disabled={status !== "connected"}
                  className="px-8 py-3 text-lg font-bold text-white rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)",
                    border: "3px solid #1D4ED8",
                    boxShadow: "0 4px 0 #1E40AF"
                  }}
                >
                  🤖 FIGHT AI (Test)
                </button>
              </div>
            )}

            <div className="mt-8">
              <Link to="/hub" className="text-gray-400 hover:text-white transition">
                ← Back to Hub
              </Link>
            </div>
          </div>
        )}

        {/* In match - Show game */}
        {currentMatch && (
          <div className="w-full max-w-4xl">
            <div className="bg-black/30 rounded-lg p-2 shadow-2xl">
              <div id="phaser-container" className="w-full" style={{ height: "500px" }}>
                <PhaserArena match={currentMatch} />
              </div>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  safeSend(attachAuthPayload({ type: "forfeit", matchId: currentMatch.matchId }));
                  setCurrentMatch(null);
                  if (window.currentMatch) delete window.currentMatch;
                }}
                className="px-4 py-2 bg-red-600/50 hover:bg-red-600 text-white text-sm rounded transition"
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
