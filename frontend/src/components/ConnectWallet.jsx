// frontend/src/components/ConnectWallet.jsx
import { useState, useEffect, useRef } from "react";
import { BrowserProvider } from "ethers";

export default function ConnectWallet({ onLogin }) {
  const [address, setAddress] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const onLoginRef = useRef(onLogin);
  const hasInitialized = useRef(false);

  // Keep ref updated
  useEffect(() => {
    onLoginRef.current = onLogin;
  }, [onLogin]);

  // Auto-login from localStorage (only once)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    const token = localStorage.getItem("duelcraft_jwt");
    const addr = localStorage.getItem("duelcraft_address");
    if (token && addr) {
      setAddress(addr);
      setStatus("connected");
      if (onLoginRef.current) onLoginRef.current({ address: addr, token });
    }
  }, []);

  async function connect() {
    setError(null);
    if (!window.ethereum) {
      setError("No wallet found. Install MetaMask.");
      return;
    }

    try {
      setStatus("connecting");

      await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);

      // Get nonce
      const r1 = await fetch(`http://localhost:4000/auth/nonce?address=${addr}`);
      const j1 = await r1.json();
      if (!j1.nonce) throw new Error(j1.error || "No nonce returned");

      const message = `DuelCraft login: ${j1.nonce}`;

      // sign message
      const signature = await signer.signMessage(message);

      // send to backend for verification
      const r2 = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, signature }),
      });

      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || "Login failed");

      localStorage.setItem("duelcraft_jwt", j2.token);
      localStorage.setItem("duelcraft_address", addr);

      setStatus("connected");
      if (onLogin) onLogin({ address: addr, token: j2.token, user: j2.user });

    } catch (e) {
      console.error(e);
      setError(e.message);
      setStatus("idle");
    }
  }

  function logout() {
    localStorage.removeItem("duelcraft_jwt");
    localStorage.removeItem("duelcraft_address");
    setAddress(null);
    setStatus("idle");
    if (onLogin) onLogin(null);
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {address ? (
        <>
          <div>{address.slice(0, 6) + "..." + address.slice(-4)}</div>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={connect} disabled={status === "connecting"}>
          {status === "connecting" ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
