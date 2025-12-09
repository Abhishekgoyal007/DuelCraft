import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";

const TIER_DATA = {
  BRONZE: {
    id: 0, name: "Bronze", icon: "🥉",
    gradient: "from-amber-700 to-amber-900", borderColor: "border-amber-600",
    glowColor: "rgba(217, 119, 6, 0.3)",
    price: "10", xpMultiplier: "1.1x", coinMultiplier: "1.1x",
    benefits: ["10% More XP", "10% More Coins", "Bronze Badge", "Exclusive Emotes"]
  },
  SILVER: {
    id: 1, name: "Silver", icon: "🥈",
    gradient: "from-gray-400 to-gray-600", borderColor: "border-gray-400",
    glowColor: "rgba(156, 163, 175, 0.3)",
    price: "25", xpMultiplier: "1.25x", coinMultiplier: "1.25x",
    benefits: ["25% More XP", "25% More Coins", "Silver Badge", "Exclusive Skins", "Priority Matchmaking"]
  },
  GOLD: {
    id: 2, name: "Gold", icon: "🥇",
    gradient: "from-yellow-400 to-amber-600", borderColor: "border-yellow-500",
    glowColor: "rgba(234, 179, 8, 0.4)",
    price: "50", xpMultiplier: "1.5x", coinMultiplier: "1.5x",
    benefits: ["50% More XP", "50% More Coins", "Gold Badge", "Exclusive Skins & Effects", "Priority Matchmaking", "Special Chat Color"]
  },
  PLATINUM: {
    id: 3, name: "Platinum", icon: "💎",
    gradient: "from-cyan-400 to-blue-600", borderColor: "border-cyan-500",
    glowColor: "rgba(34, 211, 238, 0.4)",
    price: "100", xpMultiplier: "1.75x", coinMultiplier: "2.0x",
    benefits: ["75% More XP", "100% More Coins", "Platinum Badge", "All Exclusive Content", "VIP Matchmaking", "Custom Name Color", "Monthly Bonus"]
  },
  DIAMOND: {
    id: 4, name: "Diamond", icon: "💠",
    gradient: "from-purple-400 to-pink-600", borderColor: "border-purple-500",
    glowColor: "rgba(168, 85, 247, 0.5)",
    price: "250", xpMultiplier: "2.0x", coinMultiplier: "2.5x",
    benefits: ["100% More XP", "150% More Coins", "Diamond Badge", "All Premium Content", "VIP Matchmaking", "Rainbow Name", "Weekly Bonus", "Tournament Access"]
  }
};

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: `${3 + (i % 4) * 2}px`, height: `${3 + (i % 4) * 2}px`,
            left: `${(i * 5) % 100}%`, top: `${(i * 7) % 100}%`,
            background: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#A855F7' : '#EC4899',
            opacity: 0.3,
            animation: `particle-float ${5 + (i % 3)}s ease-in-out infinite ${i * 0.3}s`
          }}
        />
      ))}
    </div>
  );
}

export default function SeasonPass() {
  const { user } = useAuth();
  const { contracts, isConnected, connect, isCorrectChain, switchToMantleNetwork } = useWeb3();
  const navigate = useNavigate();

  const [arenaBalance, setArenaBalance] = useState('0');
  const [activePass, setActivePass] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [purchasing, setPurchasing] = useState(null);
  const [message, setMessage] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { setIsLoaded(true); }, []);

  useEffect(() => {
    const loadBalance = async () => {
      if (!user?.address || !contracts?.token || !isConnected) return;
      setLoadingBalance(true);
      try {
        const balance = await contracts.token.balanceOf(user.address);
        setArenaBalance((Number(balance) / 1e18).toFixed(2));
      } catch (error) {
        console.error('Error loading ARENA balance:', error);
      } finally {
        setLoadingBalance(false);
      }
    };
    loadBalance();
  }, [user?.address, contracts, isConnected]);

  useEffect(() => {
    const checkPass = async () => {
      if (!user?.address || !contracts?.seasonPass || !isConnected) return;
      try {
        const hasPass = await contracts.seasonPass.hasActivePass(user.address);
        if (hasPass) {
          const tier = await contracts.seasonPass.getPassTier(user.address);
          const tierNames = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
          setActivePass(tierNames[Number(tier)]);
        } else {
          setActivePass(null);
        }
        const season = await contracts.seasonPass.currentSeason();
        setCurrentSeason(Number(season));
      } catch (error) {
        console.error('Error checking season pass:', error);
      }
    };
    checkPass();
  }, [user?.address, contracts, isConnected]);

  const purchasePass = async (tier) => {
    if (!isConnected) { setMessage({ type: "error", text: "Connect wallet first!" }); await connect(); return; }
    if (!isCorrectChain) { setMessage({ type: "error", text: "Switch to Mantle Sepolia!" }); await switchToMantleNetwork(); return; }

    const tierData = TIER_DATA[tier];
    const priceInARENA = parseFloat(tierData.price);
    const balanceInARENA = parseFloat(arenaBalance);

    if (balanceInARENA < priceInARENA) {
      setMessage({ type: "error", text: `Need ${priceInARENA} ARENA, have ${balanceInARENA}` });
      return;
    }
    if (activePass) {
      setMessage({ type: "error", text: "Already own a Season Pass!" });
      return;
    }

    setPurchasing(tier);
    try {
      const priceInWei = BigInt(priceInARENA * 1e18);
      setMessage({ type: "info", text: "Approving tokens..." });
      const approveTx = await contracts.token.approve(await contracts.seasonPass.getAddress(), priceInWei);
      await approveTx.wait();

      setMessage({ type: "info", text: "Purchasing Pass..." });
      const purchaseTx = await contracts.seasonPass.purchasePass(tierData.id);
      await purchaseTx.wait();

      setMessage({ type: "success", text: `🎉 Purchased ${tierData.name} Pass!` });
      setActivePass(tier);

      const newBalance = await contracts.token.balanceOf(user.address);
      setArenaBalance((Number(newBalance) / 1e18).toFixed(2));
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Purchase error:', error);
      setMessage({ type: "error", text: error.code === 4001 ? "Cancelled" : error.message || "Failed" });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f0f23 100%)" }}>

      <ParticleBackground />

      {/* Animated glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full filter blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-600 rounded-full filter blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-blue-600 rounded-full filter blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className={`max-w-7xl mx-auto px-4 py-8 relative z-10 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black mb-4 font-display text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600"
            style={{ textShadow: "0 0 60px rgba(236, 72, 153, 0.4)" }}>
            ⭐ SEASON PASS
          </h1>
          <p className="text-xl text-purple-300/80 font-semibold">Season {currentSeason} • 90 Days</p>
          <p className="text-purple-400/60">Boost your progress and unlock exclusive rewards!</p>
        </div>

        {/* Balance & Status */}
        <div className="flex justify-center gap-6 mb-10 flex-wrap">
          <div className="relative bg-gradient-to-br from-purple-600 to-indigo-700 px-8 py-4 rounded-2xl shadow-2xl border-2 border-purple-500/50 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <div className="flex items-center gap-3 relative z-10">
              <span className="text-4xl">💎</span>
              <div>
                <div className="text-3xl font-black text-white font-display">{loadingBalance ? '...' : arenaBalance}</div>
                <div className="text-sm font-bold text-purple-200">ARENA Tokens</div>
              </div>
            </div>
          </div>

          {activePass && (
            <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 px-8 py-4 rounded-2xl shadow-2xl border-2 border-green-400/50 overflow-hidden">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{TIER_DATA[activePass].icon}</span>
                <div>
                  <div className="text-2xl font-black text-white font-display">Active</div>
                  <div className="text-sm font-bold text-green-100">{TIER_DATA[activePass].name} Pass</div>
                </div>
              </div>
            </div>
          )}
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

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
          {Object.entries(TIER_DATA).map(([key, tier], idx) => {
            const isActive = activePass === key;
            const canAfford = parseFloat(arenaBalance) >= parseFloat(tier.price);

            return (
              <div
                key={key}
                className={`relative rounded-3xl p-6 transition-all duration-500 hover:scale-105 hover:-translate-y-3 overflow-hidden group ${isActive ? "ring-4 ring-green-500" : ""}`}
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                  border: isActive ? "3px solid #22c55e" : `3px solid ${tier.glowColor}`,
                  backdropFilter: "blur(20px)",
                  boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${tier.glowColor}`,
                  animationDelay: `${idx * 100}ms`
                }}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${tier.glowColor}, transparent 70%)` }} />

                {/* Tier header */}
                <div className="text-center mb-5 relative z-10">
                  <div className="text-6xl mb-3 group-hover:scale-125 transition-transform duration-300">{tier.icon}</div>
                  <h2 className="text-2xl font-black text-white mb-3 font-display">{tier.name}</h2>
                  <div className={`inline-block px-5 py-2 rounded-xl bg-gradient-to-r ${tier.gradient} border-2 ${tier.borderColor}`}>
                    <div className="text-xl font-black text-white font-display">{tier.price} 💎</div>
                  </div>
                </div>

                {/* Multipliers */}
                <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                  <div className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-xl font-black text-yellow-400 font-display">{tier.xpMultiplier}</div>
                    <div className="text-[10px] text-white/60 font-bold">XP Boost</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-xl font-black text-green-400 font-display">{tier.coinMultiplier}</div>
                    <div className="text-[10px] text-white/60 font-bold">Coins</div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mb-5 space-y-1.5 relative z-10">
                  {tier.benefits.slice(0, 4).map((benefit, bidx) => (
                    <div key={bidx} className="flex items-start gap-2 text-xs">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-white/80">{benefit}</span>
                    </div>
                  ))}
                  {tier.benefits.length > 4 && (
                    <div className="text-xs text-purple-400">+{tier.benefits.length - 4} more...</div>
                  )}
                </div>

                {/* Button */}
                {isActive ? (
                  <div className="w-full py-3 rounded-xl bg-green-500 text-white font-black text-center border-2 border-green-400 relative z-10">
                    ✓ ACTIVE
                  </div>
                ) : (
                  <button
                    onClick={() => purchasePass(key)}
                    disabled={!canAfford || purchasing === key || !isConnected}
                    className={`w-full py-3 rounded-xl font-black transition-all relative z-10 ${canAfford && isConnected
                        ? `bg-gradient-to-r ${tier.gradient} text-white hover:scale-105 shadow-lg border-2 ${tier.borderColor}`
                        : "bg-white/10 text-white/40 cursor-not-allowed border-2 border-white/10"
                      }`}
                  >
                    {purchasing === key ? "..." : !isConnected ? "CONNECT" : !canAfford ? "NEED ARENA" : "BUY"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info section */}
        <div className="max-w-4xl mx-auto rounded-3xl p-8 border-2 border-white/10 mb-8"
          style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", backdropFilter: "blur(20px)" }}>
          <h3 className="text-2xl font-black text-white mb-4 font-display flex items-center gap-3">
            <span>📖</span> About Season Pass
          </h3>
          <div className="space-y-2 text-white/70">
            <p>• Season Passes are NFTs that give you XP and Coin multipliers for 90 days</p>
            <p>• Higher tiers unlock exclusive cosmetics, badges, and special features</p>
            <p>• Passes are non-transferable and expire at the end of the season</p>
            <p>• You can upgrade your tier anytime by paying the difference</p>
            <p>• All benefits are cosmetic - no gameplay advantages!</p>
          </div>
        </div>

        {/* Back button */}
        <div className="text-center">
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
