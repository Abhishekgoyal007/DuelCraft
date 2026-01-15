import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useEffect, useState } from "react";
import { ethers, BrowserProvider } from "ethers";

import { CHARACTER_LAYERS, LAYER_ORDER, DEFAULT_AVATAR } from "../config/characterConfig";
import { getCharacterImage, getCharacterName } from "../config/characters";
import { getContractAddresses } from "../config/contracts";
import DuelCraftCharacterABI from "../contracts/abis/DuelCraftCharacter.json";
import CashDuelABI from "../contracts/abis/CashDuel.json";
import TierSelectionModal from "../components/CashDuel/TierSelectionModal";
import WaitingScreen from "../components/CashDuel/WaitingScreen";
import { FloatingNav } from "../components/FloatingNav";
import { useToast } from "../context/ToastContext";

// ===== REUSABLE COMPONENTS =====

// Floating particle background
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-30"
          style={{
            width: `${4 + (i % 4) * 2}px`,
            height: `${4 + (i % 4) * 2}px`,
            left: `${(i * 5) % 100}%`,
            top: `${(i * 7) % 100}%`,
            background: i % 2 === 0
              ? 'radial-gradient(circle, #FFD700, transparent)'
              : 'radial-gradient(circle, #66c2ff, transparent)',
            animation: `particle-float ${6 + (i % 4)}s ease-in-out infinite ${i * 0.3}s`
          }}
        />
      ))}
    </div>
  );
}

// Floating cloud component
function Cloud({ initialX, y, speed, size, delay }) {
  const [x, setX] = useState(initialX);

  useEffect(() => {
    const interval = setInterval(() => {
      setX(prev => {
        const newX = prev + speed;
        return newX > 120 ? -20 : newX;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [speed]);

  return (
    <div
      className="absolute transition-transform duration-300 hover:scale-110"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `scale(${size})`,
        zIndex: 5,
        animation: `float 3s ease-in-out infinite ${delay}s`
      }}
    >
      <img
        src="/assets/landingpage/cloud.png"
        alt="cloud"
        className="w-32 h-auto drop-shadow-lg opacity-80"
      />
    </div>
  );
}

// Premium stat card - supports both emoji and image icons
function StatCard({ icon, value, label, gradient, borderColor, glowColor }) {
  const isImageIcon = typeof icon === 'string' && icon.startsWith('/');

  return (
    <div
      className={`relative ${gradient} px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 ${borderColor} transform hover:scale-110 transition-all duration-300 overflow-hidden group cursor-default`}
      style={{ boxShadow: `0 4px 15px ${glowColor}` }}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      {isImageIcon ? (
        <img src={icon} alt="" className="w-10 h-10 object-contain drop-shadow-lg relative z-10 group-hover:scale-125 transition-transform" />
      ) : (
        <span className="text-3xl drop-shadow-lg relative z-10 group-hover:scale-125 transition-transform">{icon}</span>
      )}
      <div className="relative z-10">
        <div className="text-2xl font-black text-white drop-shadow-lg font-display">{value}</div>
        <div className="text-[9px] font-black text-white/80 tracking-wider uppercase">{label}</div>
      </div>
    </div>
  );
}

// Premium action card for hub menu - supports both emoji and image icons
function ActionCard({ to, icon, title, subtitle, gradient, borderColor, delay, isNew, onClick, dataTutorial }) {
  const isImageIcon = typeof icon === 'string' && icon.startsWith('/');

  const CardContent = () => (
    <div
      className={`relative h-full ${gradient} p-5 rounded-2xl text-white shadow-2xl transition-all duration-300 border-4 ${borderColor} transform hover:-translate-y-3 hover:scale-105 flex flex-col justify-center items-center overflow-hidden group cursor-pointer`}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 8px 0 rgba(0,0,0,0.3), 0 12px 30px rgba(0,0,0,0.2)'
      }}
      onClick={onClick}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      {/* Top gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

      {/* New badge */}
      {isNew && (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 px-3 py-1 rounded-full text-[10px] font-black animate-pulse shadow-lg z-20">
          🔥 NEW
        </div>
      )}

      <div className="relative z-10 text-center">
        {isImageIcon ? (
          <img src={icon} alt="" className="w-16 h-16 object-contain mx-auto mb-3 group-hover:scale-125 transition-transform duration-300 drop-shadow-lg" />
        ) : (
          <div className="text-5xl mb-3 group-hover:scale-125 transition-transform duration-300 drop-shadow-lg">{icon}</div>
        )}
        <div className="text-xl font-black drop-shadow-lg tracking-wide font-display">{title}</div>
        <div className="text-white/80 font-bold text-xs mt-1">{subtitle}</div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group h-full animate-fade-in" style={{ animationDelay: `${delay}ms` }} data-tutorial={dataTutorial}>
        <CardContent />
      </Link>
    );
  }

  return (
    <div className="group h-full animate-fade-in" style={{ animationDelay: `${delay}ms` }} data-tutorial={dataTutorial}>
      <CardContent />
    </div>
  );
}

// Fighter preview component
function FighterPreview({ selectedCharacter, hasNFT, nftTokenId, checkingNFT, blockchainStats, loadingStats }) {
  return (
    <div className="w-full lg:w-80 flex flex-col gap-4">
      {/* Fighter Card */}
      <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-600/50 shadow-xl">
        {/* Header */}
        <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
          ⚔️ Your Fighter
        </h3>

        {selectedCharacter ? (
          <div
            className="w-full aspect-square rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50"
          >
            {/* Character Image - Properly sized */}
            <img
              src={getCharacterImage(selectedCharacter)}
              alt={getCharacterName(selectedCharacter)}
              className="w-full h-full object-contain p-2"
              style={{
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
              }}
            />
          </div>
        ) : (
          <div
            className="w-full aspect-square rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden bg-slate-700/50 border border-dashed border-slate-500/50"
          >
            <div className="text-center">
              <div className="text-5xl mb-2 opacity-30">👤</div>
              <p className="text-slate-400 text-sm">No fighter selected</p>
            </div>
          </div>
        )}

        {/* Character Name - Clean display below image */}
        {selectedCharacter && (
          <div className="mt-3 text-center">
            <p className="text-white font-bold text-base">
              {getCharacterName(selectedCharacter)}
            </p>
          </div>
        )}
      </div>

      {/* NFT Status Card */}
      <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-600/50 shadow-xl">
        {checkingNFT ? (
          <div className="text-center py-4">
            <div className="animate-spin text-2xl mb-2">⏳</div>
            <p className="text-slate-400 text-sm">Checking blockchain...</p>
          </div>
        ) : hasNFT ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">NFT Secured</h3>
                <p className="text-slate-400 text-xs">On-Chain Asset</p>
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-3 mb-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Token ID:</span>
                <span className="text-white font-bold">#{nftTokenId}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Network:</span>
                <span className="text-white">Mantle Sepolia</span>
              </div>
            </div>

            <button
              onClick={() => {
                const contractAddresses = getContractAddresses(5003);
                const explorerUrl = `https://explorer.sepolia.mantle.xyz/token/${contractAddresses.DuelCraftCharacter}?a=${nftTokenId}`;
                window.open(explorerUrl, '_blank');
              }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors text-sm"
            >
              🌐 View on Explorer
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-slate-700/50 flex items-center justify-center">
              <span className="text-2xl opacity-50">💎</span>
            </div>
            <h3 className="font-bold text-slate-400 text-sm">No NFT Found</h3>
            <p className="text-slate-500 text-xs mt-1 mb-3">Mint your fighter on-chain!</p>

            <Link to="/creator">
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors text-sm">
                ⚡ Mint NFT
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Compact On-Chain Stats */}
      <div className="bg-slate-800/90 rounded-2xl p-3 border border-slate-600/50 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-center">
            <div className="text-slate-400 text-[10px] uppercase">NFTs</div>
            <div className="text-purple-400 font-bold text-lg">
              {loadingStats ? '...' : blockchainStats?.totalNFTs || 0}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-600"></div>
          <div className="flex-1 text-center">
            <div className="text-slate-400 text-[10px] uppercase">Duels</div>
            <div className="text-blue-400 font-bold text-lg">
              {loadingStats ? '...' : blockchainStats?.totalDuels || 0}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-600"></div>
          <div className="flex-1 text-center">
            <div className="text-slate-400 text-[10px] uppercase">Pool</div>
            <div className="text-yellow-400 font-bold text-sm">
              {loadingStats ? '...' : `${parseFloat(blockchainStats?.prizePool || 0).toFixed(1)}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN HUB COMPONENT =====

export default function Hub() {
  const { user } = useAuth();
  const { arenaBalance } = useWeb3();
  const [avatar, setAvatar] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [coins, setCoins] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });
  const [hasNFT, setHasNFT] = useState(false);
  const [nftTokenId, setNftTokenId] = useState(null);
  const [checkingNFT, setCheckingNFT] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Wallet connection state
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletStatus, setWalletStatus] = useState("idle");
  const [walletError, setWalletError] = useState(null);

  // Cash Duel state
  const [showCashDuelModal, setShowCashDuelModal] = useState(false);
  const [showWaitingScreen, setShowWaitingScreen] = useState(false);
  const [currentDuel, setCurrentDuel] = useState(null);

  // Blockchain stats state
  const [blockchainStats, setBlockchainStats] = useState({
    totalNFTs: 0,
    totalDuels: 0,
    prizePool: '0'
  });
  const [matchHistory, setMatchHistory] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const doFetch = async () => {
      if (!user?.address) return;
      
      console.log('[Hub] Fetching profile for:', user.address);
      
      try {
        const res = await fetch(`https://duelcraft-backend.onrender.com/profile?address=${user.address}`);
        
        if (!res.ok) {
          console.error('[Hub] Profile fetch failed:', res.status, res.statusText);
          return;
        }
        
        const data = await res.json();
        console.log('[Hub] Profile data received:', data);
        
        // Set data with defaults
        if (data?.avatar) {
          setAvatar(data.avatar);
        }
        if (data?.selectedCharacter) {
          setSelectedCharacter(data.selectedCharacter);
        }
        if (data?.coins !== undefined) {
          setCoins(data.coins);
        } else {
          setCoins(100); // Default starting coins
        }
        if (data?.stats) {
          setStats(data.stats);
        } else {
          setStats({ wins: 0, losses: 0, totalMatches: 0 }); // Default stats
        }
      } catch (err) {
        console.error('[Hub] Error fetching profile:', err);
        // Set defaults on error
        setCoins(100);
        setStats({ wins: 0, losses: 0, totalMatches: 0 });
      }
    };

    doFetch();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        doFetch();
      }
    };

    const handleFocus = () => doFetch();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  // Check for existing wallet connection on load
  useEffect(() => {
    const addr = localStorage.getItem("duelcraft_address");
    if (addr) {
      setWalletAddress(addr);
      setWalletStatus("connected");
    }
  }, []);

  // Fetch blockchain stats and match history
  useEffect(() => {
    const fetchBlockchainStats = async () => {
      setLoadingStats(true);
      console.log('[Hub] Fetching blockchain stats...');
      
      try {
        const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.mantle.xyz');
        const contractAddresses = getContractAddresses(5003);

        let totalNFTs = 0;
        let totalDuels = 0;
        let prizePool = '0';

        // Get total NFTs minted
        try {
          const characterContract = new ethers.Contract(
            contractAddresses.DuelCraftCharacter,
            DuelCraftCharacterABI,
            provider
          );
          totalNFTs = Number(await characterContract.totalSupply());
          console.log('[Hub] Total NFTs:', totalNFTs);
        } catch (err) {
          console.warn("Error fetching NFT count:", err.message);
        }

        // Get Cash Duel stats
        try {
          const cashDuelContract = new ethers.Contract(
            contractAddresses.CashDuel,
            CashDuelABI,
            provider
          );
          // Use getActiveDuels().length instead of totalDuels (which doesn't exist)
          const activeDuels = await cashDuelContract.getActiveDuels();
          totalDuels = activeDuels.length;
          console.log('[Hub] Active duels:', totalDuels);

          const contractBalance = await provider.getBalance(contractAddresses.CashDuel);
          prizePool = ethers.formatEther(contractBalance);
          console.log('[Hub] Prize pool:', prizePool, 'MNT');
        } catch (err) {
          console.warn("Error fetching Cash Duel stats:", err.message);
        }

        setBlockchainStats({
          totalNFTs,
          totalDuels,
          prizePool
        });
      } catch (err) {
        console.error("Error fetching blockchain stats:", err);
      }

      // Fetch match history from backend
      if (user?.address) {
        try {
          console.log('[Hub] Fetching match history for:', user.address);
          const res = await fetch(`https://duelcraft-backend.onrender.com/matches?address=${user.address}&limit=5`);
          
          if (!res.ok) {
            console.error('[Hub] Match history fetch failed:', res.status, res.statusText);
          } else {
            const data = await res.json();
            console.log('[Hub] Match history received:', data);
            if (data?.matches) {
              setMatchHistory(data.matches);
            }
          }
        } catch (err) {
          console.error("Error fetching match history:", err);
        }
      }

      setLoadingStats(false);
    };

    fetchBlockchainStats();
  }, [user]);

  // Wallet connect function
  async function connectWallet() {
    setWalletError(null);
    if (!window.ethereum) {
      setWalletError("No wallet found. Install MetaMask.");
      return;
    }

    try {
      setWalletStatus("connecting");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setWalletAddress(addr);

      const r1 = await fetch(`https://duelcraft-backend.onrender.com/auth/nonce?address=${addr}`);
      const j1 = await r1.json();
      if (!j1.nonce) throw new Error(j1.error || "No nonce returned");

      const message = `DuelCraft login: ${j1.nonce}`;
      const signature = await signer.signMessage(message);

      const r2 = await fetch("https://duelcraft-backend.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, signature }),
      });

      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || "Login failed");

      localStorage.setItem("duelcraft_jwt", j2.token);
      localStorage.setItem("duelcraft_address", addr);
      setWalletStatus("connected");

    } catch (e) {
      console.error(e);
      setWalletError(e.message);
      setWalletStatus("idle");
      setWalletAddress(null);
    }
  }

  function logoutWallet() {
    localStorage.removeItem("duelcraft_jwt");
    localStorage.removeItem("duelcraft_address");
    setWalletAddress(null);
    setWalletStatus("idle");
  }

  // Cash Duel handlers
  function handleDuelCreated(duelData) {
    setCurrentDuel(duelData);
    if (duelData.battleReady) {
      window.location.href = `/arena?cashDuel=true&duelId=${duelData.duelId}&tier=${duelData.tier.id}`;
    } else {
      setShowWaitingScreen(true);
    }
  }

  function handleOpponentJoined(matchData) {
    window.location.href = `/arena?cashDuel=true&duelId=${currentDuel.duelId}&tier=${currentDuel.tier.id}`;
  }

  function handleCancelDuel() {
    setShowWaitingScreen(false);
    setCurrentDuel(null);
  }

  // Check for NFT ownership
  useEffect(() => {
    const checkNFT = async () => {
      if (!user?.address) return;

      setCheckingNFT(true);
      try {
        const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.mantle.xyz');
        const contractAddresses = getContractAddresses(5003);
        const characterContract = new ethers.Contract(
          contractAddresses.DuelCraftCharacter,
          DuelCraftCharacterABI,
          provider
        );

        const tokenId = await characterContract.walletToCharacter(user.address);

        if (tokenId > 0) {
          setHasNFT(true);
          setNftTokenId(tokenId.toString());
        } else {
          setHasNFT(false);
          setNftTokenId(null);
        }
      } catch (err) {
        console.error("Error checking NFT:", err);
        setHasNFT(false);
        setNftTokenId(null);
      } finally {
        setCheckingNFT(false);
      }
    };

    checkNFT();
  }, [user]);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/landingpage/landingpagebg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Floating particles */}
      <ParticleBackground />

      {/* Animated clouds */}
      <Cloud initialX={10} y={5} speed={0.06} size={0.8} delay={0} />
      <Cloud initialX={40} y={12} speed={0.04} size={1} delay={1} />
      <Cloud initialX={70} y={8} speed={0.05} size={0.9} delay={2} />

      {/* Floating Navigation */}
      <FloatingNav showHome={false} />

      <main className={`relative z-10 max-w-7xl mx-auto px-4 py-6 flex flex-col min-h-screen transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>

        {/* Top Stats Bar */}
        {/* Top Stats Bar */}
        <div className="mb-6 flex gap-3 justify-center flex-wrap animate-slide-down">
          {/* Home Button */}
          <Link to="/">
            <div className="relative bg-gradient-to-br from-blue-500 to-cyan-600 px-4 py-4 rounded-2xl shadow-2xl flex items-center justify-center border-4 border-blue-700 transform hover:scale-110 transition-all hover:-rotate-3 overflow-hidden cursor-pointer group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              <img src="/assets/logos/home.png" alt="Home" className="w-8 h-8 object-contain drop-shadow-lg relative z-10" />
            </div>
          </Link>

          <StatCard
            icon="/assets/logos/coin.png"
            value={coins}
            label="Gold Stash"
            gradient="bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600"
            borderColor="border-yellow-700"
            glowColor="rgba(255, 215, 0, 0.3)"
          />

          <StatCard
            icon="/assets/logos/gem.png"
            value={arenaBalance || '0.00'}
            label="Arena Tokens"
            gradient="bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-700"
            borderColor="border-purple-800"
            glowColor="rgba(168, 85, 247, 0.3)"
          />

          <StatCard
            icon="/assets/logos/trophy.png"
            value={stats.wins || 0}
            label="Victories"
            gradient="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600"
            borderColor="border-green-700"
            glowColor="rgba(16, 185, 129, 0.3)"
          />

          <StatCard
            icon="/assets/logos/swordicon.png"
            value={stats.losses || 0}
            label="Defeats"
            gradient="bg-gradient-to-br from-red-600 via-rose-600 to-red-800"
            borderColor="border-red-900"
            glowColor="rgba(239, 68, 68, 0.3)"
          />

          {/* Wallet */}
          {walletStatus === "connected" && walletAddress ? (
            <button
              onClick={logoutWallet}
              className="relative bg-gradient-to-br from-green-500 to-emerald-600 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-green-700 transform hover:scale-105 transition-all overflow-hidden cursor-pointer group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              <span className="text-2xl relative z-10">🔗</span>
              <div className="relative z-10">
                <div className="text-[9px] font-black text-green-100 tracking-wider">CONNECTED</div>
                <div className="text-sm font-black text-white font-display">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={connectWallet}
              disabled={walletStatus === "connecting"}
              className="relative bg-gradient-to-br from-orange-500 to-red-600 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-orange-700 transform hover:scale-110 transition-all overflow-hidden cursor-pointer group disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              <span className="text-2xl relative z-10 animate-pulse">🔌</span>
              <div className="relative z-10">
                <div className="text-sm font-black text-white font-display">
                  {walletStatus === "connecting" ? "CONNECTING..." : "CONNECT"}
                </div>
                <div className="text-[9px] font-black text-orange-100 tracking-wider">WALLET</div>
              </div>
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex gap-6 flex-col lg:flex-row flex-1">
          {/* Action Grid */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-4 text-center lg:text-left">
              <h1 className="text-4xl font-black text-white font-display drop-shadow-lg flex items-center justify-center lg:justify-start gap-3">
                <img src="/assets/logos/swordicon.png" alt="" className="w-10 h-10" /> GAME HUB
              </h1>
              <p className="text-white/70 font-semibold">Choose your destiny and battle!</p>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <ActionCard
                to="/arena"
                icon="/assets/logos/swordicon.png"
                title="BATTLE!"
                subtitle="⚡ Instant Combat ⚡"
                gradient="bg-gradient-to-br from-red-600 via-red-700 to-red-900"
                borderColor="border-red-900"
                delay={0}
                dataTutorial="battle"
              />

              <ActionCard
                to="/creator"
                icon="/assets/logos/warrior.png"
                title="FORGE HERO"
                subtitle="✦ Craft Your Legend ✦"
                gradient="bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500"
                borderColor="border-yellow-600"
                delay={50}
                dataTutorial="forge"
              />

              <ActionCard
                to="/shop"
                icon="/assets/logos/coin.png"
                title="ARMORY"
                subtitle="⚜️ Gear & Glory ⚜️"
                gradient="bg-gradient-to-br from-purple-600 via-violet-600 to-purple-800"
                borderColor="border-purple-900"
                delay={100}
                dataTutorial="shop"
              />

              <ActionCard
                to="/marketplace"
                icon="/assets/logos/bazaar.png"
                title="BAZAAR"
                subtitle="💎 NFT Exchange 💎"
                gradient="bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700"
                borderColor="border-blue-900"
                delay={150}
              />

              <ActionCard
                to="/tournament"
                icon="/assets/logos/trophy.png"
                title="ARENA WAR"
                subtitle="⚡ Glory Awaits ⚡"
                gradient="bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700"
                borderColor="border-purple-900"
                delay={200}
              />

              <ActionCard
                to="/season-pass"
                icon="/assets/logos/star.png"
                title="VIP PASS"
                subtitle="✨ Elite Rewards ✨"
                gradient="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-800"
                borderColor="border-indigo-900"
                delay={250}
              />

              <ActionCard
                to="/leaderboard"
                icon="/assets/logos/leaderboard.png"
                title="HALL OF FAME"
                subtitle="⭐ Top Legends ⭐"
                gradient="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700"
                borderColor="border-green-800"
                delay={300}
              />

              {/* Battle Stats Card */}
              <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border-2 border-white/10 shadow-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '350ms' }}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400" />
                <div className="flex items-center gap-2 mb-3 justify-center">
                  <span className="text-2xl">📈</span>
                  <h3 className="font-black text-white text-sm font-display">BATTLE RECORD</h3>
                </div>
                <div className="flex justify-around text-sm">
                  <div className="text-center bg-green-500/20 rounded-lg p-2 border border-green-500/30">
                    <div className="text-green-300 font-bold text-[10px]">WINS</div>
                    <div className="text-green-400 font-black text-2xl font-display">{stats.wins || 0}</div>
                  </div>
                  <div className="text-center bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                    <div className="text-red-300 font-bold text-[10px]">LOSSES</div>
                    <div className="text-red-400 font-black text-2xl font-display">{stats.losses || 0}</div>
                  </div>
                </div>
              </div>

              {/* Cash Duel Button */}
              <ActionCard
                icon="/assets/logos/cashduel.png"
                title="CASH DUEL"
                subtitle="💎 Real Stakes 💎"
                gradient="bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500"
                borderColor="border-yellow-600"
                delay={400}
                isNew={true}
                onClick={() => setShowCashDuelModal(true)}
              />
            </div>
          </div>

          {/* Fighter Preview Sidebar */}
          <FighterPreview
            selectedCharacter={selectedCharacter}
            hasNFT={hasNFT}
            nftTokenId={nftTokenId}
            checkingNFT={checkingNFT}
            blockchainStats={blockchainStats}
            loadingStats={loadingStats}
          />
        </div>
      </main>

      {/* Wallet Error Toast */}
      {walletError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce-in flex items-center gap-3">
          <span>❌</span>
          {walletError}
          <button onClick={() => setWalletError(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Cash Duel Modals */}
      <TierSelectionModal
        isOpen={showCashDuelModal}
        onClose={() => setShowCashDuelModal(false)}
        onDuelCreated={handleDuelCreated}
      />

      {showWaitingScreen && currentDuel && (
        <WaitingScreen
          duelInfo={currentDuel}
          onCancel={handleCancelDuel}
          onOpponentJoined={handleOpponentJoined}
        />
      )}

      {/* CSS Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes particle-float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-50px) translateX(20px);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
