// frontend/src/App.jsx
import { useEffect, useRef, useState } from "react";
import PhaserArena from "./components/PhaserArena";
import ConnectWallet from "./components/ConnectWallet";

export default function App() {
  const wsRef = useRef(null);
  const reconnectRef = useRef(0);
  const [status, setStatus] = useState("disconnected");
  const [logs, setLogs] = useState([]);
  const [inQueue, setInQueue] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchResult, setMatchResult] = useState(null); // { won: boolean, coinsEarned, reason }
  const [coins, setCoins] = useState(0); // User's coin balance

  // auth / user state from ConnectWallet
  const [user, setUser] = useState(null); // { address, token, user }
  const [userProfile, setUserProfile] = useState(null); // { avatar: {...} }

  // Fetch profile and coins when user changes
  useEffect(() => {
    async function loadProfile() {
      if (user?.address) {
        try {
          const res = await fetch(`http://localhost:4000/profile?address=${user.address}`);
          const data = await res.json();
          if (data?.avatar) {
            setUserProfile({ avatar: data.avatar });
          }
          if (data?.coins !== undefined) {
            setCoins(data.coins);
          }
          console.log("[App] Profile loaded, coins:", data.coins);
        } catch (err) {
          console.warn("[App] Failed to fetch profile:", err);
        }
      } else {
        setUserProfile(null);
        setCoins(0);
      }
    }
    loadProfile();
  }, [user]);

  // Refresh coins after match ends
  useEffect(() => {
    if (matchResult && user?.address) {
      // Refetch profile to get updated coin balance
      fetch(`http://localhost:4000/profile?address=${user.address}`)
        .then(res => res.json())
        .then(data => {
          if (data?.coins !== undefined) {
            setCoins(data.coins);
          }
        })
        .catch(() => {});
    }
  }, [matchResult, user?.address]);

  // expose user globally for other scripts (Phaser etc.)
  useEffect(() => {
    if (user) {
      window.currentUser = user;
    } else {
      if (window.currentUser) delete window.currentUser;
    }
    return () => {
      if (window.currentUser) delete window.currentUser;
    };
  }, [user]);

  // Append a timestamped log line, keep last 80 lines
  function log(msg) {
    setLogs((s) => {
      const next = [...s, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return next.slice(-80);
    });
  }

  // Safe send helper (reads wsRef)
  function safeSend(obj) {
    const sock = wsRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) {
      log("Socket not open — cannot send");
      return false;
    }
    try {
      sock.send(JSON.stringify(obj));
      return true;
    } catch (err) {
      log("Send error");
      return false;
    }
  }

  // helper to attach lightweight auth to WS payloads
  function attachAuthPayload(payload) {
    if (user && user.address) {
      payload.auth = { address: user.address, token: user.token || null };
      // Include profile/avatar if available
      if (userProfile?.avatar) {
        payload.profile = { avatar: userProfile.avatar };
      }
    }
    return payload;
  }

  // Connect logic (idempotent)
  function connect() {
    if (wsRef.current) return; // already connecting/connected

    setStatus("connecting");
    log("Connecting to ws://localhost:4000/ws ...");

    const socket = new WebSocket("ws://localhost:4000/ws");

    socket.onopen = () => {
      reconnectRef.current = 0;
      wsRef.current = socket;
      setStatus("connected");
      log("WebSocket open");
    };

    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);

        // Important messages
        if (data.type === "welcome") {
          log("Welcome id: " + data.id);
        } else if (data.type === "match_start") {
          log("Match started: " + data.matchId);
          setCurrentMatch(data);
          setInQueue(false);

          // expose to Phaser / renderer
          try {
            window.currentMatch = data;
          } catch (e) {}
        } else if (data.type === "match_end") {
          log("Match ended: " + (data.matchId || "unknown"));
          
          // Determine if we won
          const myId = window.currentMatch?.playerId;
          const won = data.winner === myId;
          const coinsEarned = won ? data.rewards?.winner?.coins : data.rewards?.loser?.coins;
          
          setMatchResult({
            won,
            coinsEarned: coinsEarned || 0,
            reason: data.reason
          });
          
          log(won ? `🎉 YOU WON! +${coinsEarned} coins` : `💀 You lost. +${coinsEarned} coins`);
          
          setCurrentMatch(null);
          setInQueue(false);
          if (window.currentMatch) delete window.currentMatch;
        } else if (data.type === "state") {
          // Forward state to game renderer silently (no UI flooding)
          if (typeof window !== "undefined" && typeof window.handleServerState === "function") {
            try {
              window.handleServerState(data);
            } catch (err) {
              // don't break socket loop
              log("Renderer handler error");
            }
          }
          // For debug, occasionally log every 200 ticks: (uncomment if needed)
          // if (data.tick && data.tick % 200 === 0) log(`tick ${data.tick}`);
        } else if (data.type === "input_ack") {
          // optionally collect metrics
        } else if (data.type === "error") {
          log("Server error: " + data.message);
        } else {
          // fallback log for other messages
          log("RECV: " + JSON.stringify(data));
        }
      } catch (err) {
        log("Malformed server message");
      }
    };

    socket.onclose = (ev) => {
      wsRef.current = null;
      setStatus("disconnected");
      log("WS closed: " + (ev.reason || `code=${ev.code}`));

      // clear current match reference if any
      setCurrentMatch((m) => {
        if (m) {
          if (window.currentMatch) delete window.currentMatch;
          log("Cleared current match due to socket close");
        }
        return null;
      });

      // reconnect with exponential backoff
      reconnectRef.current++;
      const delay = Math.min(5000, 500 * Math.pow(1.8, reconnectRef.current));
      log("Reconnecting in " + Math.round(delay) + "ms");
      setTimeout(() => connect(), delay);
    };

    socket.onerror = (err) => {
      log("WS error: " + (err?.message || "unknown"));
    };
  }

  // Start connection once on mount
  useEffect(() => {
    connect();
    // cleanup on unmount
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
        wsRef.current = null;
      }
      // remove any globals we exposed
      if (window.sendInput) delete window.sendInput;
      if (window.handleServerState) delete window.handleServerState;
      if (window.currentMatch) delete window.currentMatch;
      if (window.currentUser) delete window.currentUser;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose sendInput globally for the Phaser scene to call:
  useEffect(() => {
    window.sendInput = (payload) => {
      // payload expected: { type: 'input', matchId, tick, inputs: {...} }
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        log("sendInput failed: socket not open");
        return false;
      }
      try {
        wsRef.current.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        log("sendInput send error");
        return false;
      }
    };

    // cleanup when App unmounts
    return () => {
      if (window.sendInput) delete window.sendInput;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // join matchmaking queue
  function joinQueue() {
    if (inQueue) {
      log("Already in queue");
      return;
    }
    if (currentMatch) {
      log("You are already in a match");
      return;
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      log("Socket not open yet — wait for status connected");
      return;
    }
    // attach auth info if available
    const payload = attachAuthPayload({ type: "join_queue" });
    const ok = safeSend(payload);
    if (ok) {
      setInQueue(true);
      log("Sent join_queue");
    }
  }

  // leave queue / cancel
  function leaveQueue() {
    if (!inQueue) return;
    const payload = attachAuthPayload({ type: "leave_queue" });
    safeSend(payload); // server may ignore if not implemented
    setInQueue(false);
    log("Sent leave_queue");
  }

  // allow user to force-leave an active match (local-only — server should verify)
  function forfeitMatch() {
    if (!currentMatch) return;
    // tell server you left match (server should handle)
    const payload = attachAuthPayload({ type: "forfeit", matchId: currentMatch.matchId });
    safeSend(payload);
    setCurrentMatch(null);
    if (window.currentMatch) delete window.currentMatch;
    log("Forfeited match (client-side)");
  }

  // Called by ConnectWallet when login/logout happens
  function handleLogin(info) {
    if (!info) {
      setUser(null);
      log("User logged out");
      return;
    }
    // info: { address, token, user }
    setUser({ address: info.address, token: info.token, user: info.user });
    log("User logged in: " + info.address);
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          DuelCraft — WS Test {currentMatch ? `(Match: ${currentMatch.matchId.slice(0, 8)})` : ""}
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* show connected wallet address if present */}
          {user ? (
            <div style={{ fontSize: 13 }}>
              {user.address.slice(0, 6) + "..." + user.address.slice(-4)}
            </div>
          ) : null}
          <ConnectWallet onLogin={handleLogin} />
        </div>
      </header>

      {/* Coins display */}
      {user && (
        <div style={{
          background: "linear-gradient(135deg, #ffd700 0%, #ffb347 100%)",
          padding: "8px 16px",
          borderRadius: 8,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        }}>
          <span style={{ fontSize: 20 }}>🪙</span>
          <span style={{ fontWeight: "bold", fontSize: 18, color: "#333" }}>{coins}</span>
          <span style={{ fontSize: 12, color: "#555" }}>coins</span>
        </div>
      )}

      {/* Match Result Popup */}
      {matchResult && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: matchResult.won ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            padding: "40px 60px",
            borderRadius: 16,
            textAlign: "center",
            color: "white",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {matchResult.won ? "🎉" : "💀"}
            </div>
            <h2 style={{ fontSize: 32, margin: "0 0 8px 0" }}>
              {matchResult.won ? "VICTORY!" : "DEFEAT"}
            </h2>
            <p style={{ fontSize: 18, margin: "0 0 20px 0", opacity: 0.9 }}>
              {matchResult.reason === "hp_depleted" ? (matchResult.won ? "You knocked out your opponent!" : "You were knocked out!") : "Match ended"}
            </p>
            <div style={{
              background: "rgba(255,255,255,0.2)",
              padding: "12px 24px",
              borderRadius: 8,
              marginBottom: 20
            }}>
              <span style={{ fontSize: 24 }}>🪙 +{matchResult.coinsEarned}</span>
            </div>
            <button
              onClick={() => setMatchResult(null)}
              style={{
                background: "white",
                color: matchResult.won ? "#16a34a" : "#dc2626",
                border: "none",
                padding: "12px 32px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* controls: positioned above the canvas so clicks reach buttons */}
      <div
        style={{
          position: "relative",
          zIndex: 1000,
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12
        }}
      >
        <div>
          Status:{" "}
          <strong style={{ color: status === "connected" ? "green" : status === "connecting" ? "orange" : "red" }}>
            {status}
          </strong>
        </div>

        <button
          onClick={joinQueue}
          disabled={status !== "connected" || inQueue || Boolean(currentMatch)}
          style={{ padding: "8px 12px" }}
        >
          {inQueue ? "Waiting in queue..." : "Join Queue"}
        </button>

        <button onClick={leaveQueue} disabled={!inQueue} style={{ padding: "8px 12px" }}>
          Leave Queue
        </button>

        <button onClick={forfeitMatch} disabled={!currentMatch} style={{ padding: "8px 12px" }}>
          Forfeit Match
        </button>

        <div style={{ marginLeft: "auto" }}>
          Connected socket: {wsRef.current ? (wsRef.current.readyState === WebSocket.OPEN ? "OPEN" : "OTHER") : "none"}
        </div>
      </div>

      {/* When there's an active match, mount the Phaser arena component */}
      {currentMatch ? (
        <div className="bg-sky-100 border rounded-lg p-4" style={{ marginBottom: 12, position: "relative" }}>
          <div className="w-full h-64 md:h-80" id="phaser-container">
            {/* PhaserArena mounts into this element via Phaser config parent */}
          </div>
          <PhaserArena match={currentMatch} />
          {/* overlay info (floating on top of canvas) */}
          <div style={{ position: "absolute", left: 12, top: 12, zIndex: 1100 }}>
            <button
              onClick={() => {
                setCurrentMatch(null);
                if (window.currentMatch) delete window.currentMatch;
                log("Returned to lobby (match cleared)");
              }}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      ) : null}

      {/* Match Result Modal */}
      {matchResult && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <div 
            style={{
              background: matchResult.won ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #ef4444, #dc2626)",
              padding: "40px 60px",
              borderRadius: 16,
              textAlign: "center",
              color: "white",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {matchResult.won ? "🏆" : "💀"}
            </div>
            <h2 style={{ fontSize: 36, margin: "0 0 8px 0" }}>
              {matchResult.won ? "VICTORY!" : "DEFEAT"}
            </h2>
            <p style={{ fontSize: 18, margin: "0 0 20px 0", opacity: 0.9 }}>
              {matchResult.reason === "forfeit" 
                ? "Opponent forfeited" 
                : matchResult.won 
                  ? "You knocked out your opponent!" 
                  : "You were knocked out!"}
            </p>
            <div 
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "12px 24px",
                borderRadius: 8,
                marginBottom: 24
              }}
            >
              <span style={{ fontSize: 24 }}>💰 +{matchResult.coinsEarned} coins</span>
            </div>
            <button
              onClick={() => setMatchResult(null)}
              style={{
                background: "white",
                color: matchResult.won ? "#16a34a" : "#dc2626",
                border: "none",
                padding: "12px 32px",
                fontSize: 18,
                fontWeight: "bold",
                borderRadius: 8,
                cursor: "pointer"
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      <div style={{ maxHeight: 360, overflow: "auto", background: "#f7f7f7", padding: 12 }}>
        {logs.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: "#111", marginBottom: 6 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
