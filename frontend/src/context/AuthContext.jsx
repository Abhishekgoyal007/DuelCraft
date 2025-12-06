import { createContext, useContext, useState, useEffect } from "react";
import { BrowserProvider } from "ethers";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // { avatar: {...} }

  // shorten address for UI
  const shortAddress = (addr) =>
    addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";

  // Fetch profile from backend
  async function fetchProfile(address) {
    try {
      const res = await fetch(`http://localhost:4000/profile?address=${address}`);
      const data = await res.json();
      if (data?.avatar) {
        setProfile({ avatar: data.avatar });
        console.log("[AuthContext] Profile loaded:", data.avatar);
        return data.avatar;
      }
    } catch (err) {
      console.warn("[AuthContext] Failed to fetch profile:", err);
    }
    return null;
  }

  // Connect wallet
  async function login() {
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      const newUser = {
        address,
        short: shortAddress(address),
      };
      setUser(newUser);
      
      // Store to localStorage so Arena can access it
      localStorage.setItem("duelcraft_address", address);
      
      // Fetch profile after login
      await fetchProfile(address);
    } catch (err) {
      console.error("Wallet connect error:", err);
    }
  }

  // Disconnect
  function logout() {
    setUser(null);
    setProfile(null);
    localStorage.removeItem("duelcraft_address");
    localStorage.removeItem("duelcraft_jwt");
  }

  // Update profile (called after saving character)
  function updateProfile(avatar) {
    setProfile({ avatar });
  }

  // Auto-load on page refresh (optional)
  useEffect(() => {
    async function load() {
      try {
        // First check localStorage
        const storedAddr = localStorage.getItem("duelcraft_address");
        if (storedAddr) {
          setUser({
            address: storedAddr,
            short: shortAddress(storedAddr),
          });
          await fetchProfile(storedAddr);
          return;
        }
        
        // Then try MetaMask
        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            const address = accounts[0];
            setUser({
              address,
              short: shortAddress(address),
            });
            localStorage.setItem("duelcraft_address", address);
            // Also fetch profile on auto-load
            await fetchProfile(address);
          }
        }
      } catch (e) {
        console.warn("[AuthContext] Auto-load error:", e);
      }
    }
    load();
  }, []);

  // Sync user to window.currentUser for Phaser/game access
  useEffect(() => {
    if (user) {
      window.currentUser = user;
      console.log("[AuthContext] window.currentUser set:", user.address);
    } else {
      delete window.currentUser;
    }
    return () => {
      delete window.currentUser;
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
