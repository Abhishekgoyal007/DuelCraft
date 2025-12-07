import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import Navbar from "../components/Navbar";

const TIER_DATA = {
  BRONZE: {
    id: 0,
    name: "Bronze",
    icon: "🥉",
    color: "from-amber-600 to-amber-800",
    borderColor: "border-amber-700",
    price: "10",
    xpMultiplier: "1.1x",
    coinMultiplier: "1.1x",
    benefits: ["10% More XP", "10% More Coins", "Bronze Badge", "Exclusive Emotes"]
  },
  SILVER: {
    id: 1,
    name: "Silver",
    icon: "🥈",
    color: "from-gray-300 to-gray-500",
    borderColor: "border-gray-400",
    price: "25",
    xpMultiplier: "1.25x",
    coinMultiplier: "1.25x",
    benefits: ["25% More XP", "25% More Coins", "Silver Badge", "Exclusive Skins", "Priority Matchmaking"]
  },
  GOLD: {
    id: 2,
    name: "Gold",
    icon: "🥇",
    color: "from-yellow-400 to-yellow-600",
    borderColor: "border-yellow-500",
    price: "50",
    xpMultiplier: "1.5x",
    coinMultiplier: "1.5x",
    benefits: ["50% More XP", "50% More Coins", "Gold Badge", "Exclusive Skins & Effects", "Priority Matchmaking", "Special Chat Color"]
  },
  PLATINUM: {
    id: 3,
    name: "Platinum",
    icon: "💎",
    color: "from-cyan-400 to-blue-600",
    borderColor: "border-cyan-500",
    price: "100",
    xpMultiplier: "1.75x",
    coinMultiplier: "2.0x",
    benefits: ["75% More XP", "100% More Coins", "Platinum Badge", "All Exclusive Content", "VIP Matchmaking", "Custom Name Color", "Monthly Bonus Rewards"]
  },
  DIAMOND: {
    id: 4,
    name: "Diamond",
    icon: "💠",
    color: "from-purple-400 to-pink-600",
    borderColor: "border-purple-500",
    price: "250",
    xpMultiplier: "2.0x",
    coinMultiplier: "2.5x",
    benefits: ["100% More XP", "150% More Coins", "Diamond Badge", "All Premium Content", "VIP Matchmaking", "Rainbow Name", "Weekly Bonus Rewards", "Exclusive Tournament Access"]
  }
};

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
  const [seasonEndDate, setSeasonEndDate] = useState(null);

  // Load ARENA token balance
  useEffect(() => {
    const loadBalance = async () => {
      if (!user?.address || !contracts?.token || !isConnected) return;
      
      setLoadingBalance(true);
      try {
        const balance = await contracts.token.balanceOf(user.address);
        const formatted = (Number(balance) / 1e18).toFixed(2);
        setArenaBalance(formatted);
      } catch (error) {
        console.error('Error loading ARENA balance:', error);
      } finally {
        setLoadingBalance(false);
      }
    };
    
    loadBalance();
  }, [user?.address, contracts, isConnected]);

  // Check if user has active season pass
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
        
        // Get current season info
        const season = await contracts.seasonPass.currentSeason();
        setCurrentSeason(Number(season));
      } catch (error) {
        console.error('Error checking season pass:', error);
      }
    };
    
    checkPass();
  }, [user?.address, contracts, isConnected]);

  const purchasePass = async (tier) => {
    if (!isConnected) {
      setMessage({ type: "error", text: "Please connect your wallet first!" });
      await connect();
      return;
    }

    if (!isCorrectChain) {
      setMessage({ type: "error", text: "Please switch to Mantle Sepolia network!" });
      await switchToMantleNetwork();
      return;
    }

    const tierData = TIER_DATA[tier];
    const priceInARENA = parseFloat(tierData.price);
    const balanceInARENA = parseFloat(arenaBalance);

    if (balanceInARENA < priceInARENA) {
      setMessage({ 
        type: "error", 
        text: `Insufficient ARENA tokens! You need ${priceInARENA} ARENA but have ${balanceInARENA}.` 
      });
      return;
    }

    if (activePass) {
      setMessage({ type: "error", text: "You already own a Season Pass for this season!" });
      return;
    }

    setPurchasing(tier);
    try {
      // First approve ARENA tokens
      const priceInWei = BigInt(priceInARENA * 1e18);
      setMessage({ type: "info", text: "Approving ARENA tokens..." });
      
      const approveTx = await contracts.token.approve(
        await contracts.seasonPass.getAddress(),
        priceInWei
      );
      await approveTx.wait();

      // Purchase the pass
      setMessage({ type: "info", text: "Purchasing Season Pass..." });
      const purchaseTx = await contracts.seasonPass.purchasePass(tierData.id);
      const receipt = await purchaseTx.wait();

      setMessage({ 
        type: "success", 
        text: `🎉 Successfully purchased ${tierData.name} Season Pass!` 
      });
      setActivePass(tier);
      
      // Reload balance
      const newBalance = await contracts.token.balanceOf(user.address);
      const formatted = (Number(newBalance) / 1e18).toFixed(2);
      setArenaBalance(formatted);

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Purchase error:', error);
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        setMessage({ type: "error", text: "Transaction cancelled" });
      } else {
        setMessage({ type: "error", text: error.message || "Purchase failed" });
      }
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      <Navbar />
      
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-6xl font-black mb-4 animate-fade-in"
            style={{
              textShadow: "4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
              background: "linear-gradient(to right, #FFD700, #FF1493, #00FFFF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            ⭐ SEASON PASS
          </h1>
          <p className="text-xl text-purple-200 font-bold mb-2">Season {currentSeason} • 90 Days</p>
          <p className="text-purple-300">Boost your progress and unlock exclusive rewards!</p>
        </div>

        {/* Balance & Status */}
        <div className="flex justify-center gap-6 mb-12">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 px-8 py-4 rounded-2xl shadow-2xl border-4 border-purple-400">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💎</span>
              <div>
                <div className="text-3xl font-black text-white">{loadingBalance ? '...' : arenaBalance}</div>
                <div className="text-sm font-bold text-purple-200">ARENA Tokens</div>
              </div>
            </div>
          </div>
          
          {activePass && (
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-8 py-4 rounded-2xl shadow-2xl border-4 border-green-400">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{TIER_DATA[activePass].icon}</span>
                <div>
                  <div className="text-2xl font-black text-white">Active</div>
                  <div className="text-sm font-bold text-green-200">{TIER_DATA[activePass].name} Pass</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message notification */}
        {message && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-5 rounded-2xl border-4 font-black text-lg shadow-2xl animate-bounce-in ${
            message.type === "success" 
              ? "bg-gradient-to-r from-green-400 to-emerald-500 border-green-600 text-white" 
              : message.type === "error" 
                ? "bg-gradient-to-r from-red-400 to-red-500 border-red-600 text-white" 
                : "bg-gradient-to-r from-blue-400 to-blue-500 border-blue-600 text-white"
          }`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-4">✕</button>
          </div>
        )}

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {Object.entries(TIER_DATA).map(([key, tier]) => {
            const isActive = activePass === key;
            const canAfford = parseFloat(arenaBalance) >= parseFloat(tier.price);
            
            return (
              <div 
                key={key}
                className={`rounded-3xl p-6 transition-all hover:scale-105 hover:-translate-y-2 ${
                  isActive ? "ring-8 ring-green-400 ring-opacity-75" : ""
                }`}
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,
                  backdropFilter: "blur(10px)",
                  border: isActive ? "6px solid #22c55e" : "4px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
                }}
              >
                {/* Tier header */}
                <div className="text-center mb-6">
                  <div className="text-7xl mb-3">{tier.icon}</div>
                  <h2 className="text-3xl font-black text-white mb-2">{tier.name}</h2>
                  <div className={`inline-block px-6 py-2 rounded-full bg-gradient-to-r ${tier.color} border-4 ${tier.borderColor}`}>
                    <div className="text-2xl font-black text-white">{tier.price} 💎</div>
                    <div className="text-xs text-white/80">ARENA TOKENS</div>
                  </div>
                </div>

                {/* Multipliers */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/10 rounded-xl p-3 text-center border-2 border-white/20">
                    <div className="text-2xl font-black text-yellow-300">{tier.xpMultiplier}</div>
                    <div className="text-xs text-white/80">XP Boost</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center border-2 border-white/20">
                    <div className="text-2xl font-black text-green-300">{tier.coinMultiplier}</div>
                    <div className="text-xs text-white/80">Coin Boost</div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mb-6 space-y-2">
                  {tier.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-white/90">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Purchase button */}
                {isActive ? (
                  <div className="w-full py-4 rounded-xl bg-green-500 text-white font-black text-center border-4 border-green-400">
                    ✓ ACTIVE
                  </div>
                ) : (
                  <button
                    onClick={() => purchasePass(key)}
                    disabled={!canAfford || purchasing === key || !isConnected}
                    className={`w-full py-4 rounded-xl font-black text-lg transition-all ${
                      canAfford && isConnected
                        ? `bg-gradient-to-r ${tier.color} text-white hover:scale-105 shadow-lg border-4 ${tier.borderColor}`
                        : "bg-gray-600 text-gray-400 cursor-not-allowed border-4 border-gray-700"
                    }`}
                  >
                    {purchasing === key ? "PURCHASING..." : !isConnected ? "CONNECT WALLET" : !canAfford ? "INSUFFICIENT ARENA" : "PURCHASE"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info section */}
        <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-4 border-white/20 shadow-2xl mb-8">
          <h3 className="text-2xl font-black text-white mb-4">📖 About Season Pass</h3>
          <div className="space-y-3 text-white/80">
            <p>• Season Passes are NFTs that give you XP and Coin multipliers for 90 days</p>
            <p>• Higher tiers unlock exclusive cosmetics, badges, and special features</p>
            <p>• Passes are non-transferable and expire at the end of the season</p>
            <p>• You can upgrade your tier at any time by paying the difference</p>
            <p>• All benefits are cosmetic - no gameplay advantages!</p>
          </div>
        </div>

        {/* Back button */}
        <div className="text-center">
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
