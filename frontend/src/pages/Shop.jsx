// src/pages/Shop.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FloatingNav } from "../components/FloatingNav";
import { useToast } from "../context/ToastContext";

// Legacy shop items (skins, emotes etc)
const LEGACY_SHOP_ITEMS = [
  { id: "effect_fire", name: "Fire Aura", category: "effects", price: 200, preview: "🔥", rarity: "epic" },
  { id: "effect_ice", name: "Ice Trail", category: "effects", price: 200, preview: "❄️", rarity: "rare" },
  { id: "effect_lightning", name: "Lightning Spark", category: "effects", price: 250, preview: "⚡", rarity: "legendary" },
  { id: "emote_dance", name: "Victory Dance", category: "emotes", price: 80, preview: "💃", rarity: "uncommon" },
  { id: "emote_taunt", name: "Taunt", category: "emotes", price: 50, preview: "😤", rarity: "common" },
  { id: "emote_wave", name: "Wave", category: "emotes", price: 30, preview: "👋", rarity: "common" },
];

const CATEGORIES = [
  { id: "all", name: "All Items", icon: "🛒" },
  { id: "body", name: "Bodies", icon: "🧍" },
  { id: "hair", name: "Hair Styles", icon: "💇" },
  { id: "eyes", name: "Eyes", icon: "👀" },
  { id: "tops", name: "Outfits", icon: "👕" },
  { id: "effects", name: "Effects", icon: "✨" },
  { id: "emotes", name: "Emotes", icon: "🎭" },
];

const CATEGORY_ICONS = {
  body: "🧍", hair: "💇", eyes: "👀", mouth: "👄", tops: "👕",
  bottoms: "👖", shoes: "👟", effect: "✨", accessory: "🎩",
  background: "🖼️", effects: "✨", emotes: "🎭"
};

const RARITY_CONFIG = {
  common: { color: "#9CA3AF", glow: "rgba(156, 163, 175, 0.3)", label: "Common" },
  uncommon: { color: "#22C55E", glow: "rgba(34, 197, 94, 0.3)", label: "Uncommon" },
  rare: { color: "#3B82F6", glow: "rgba(59, 130, 246, 0.4)", label: "Rare" },
  epic: { color: "#A855F7", glow: "rgba(168, 85, 247, 0.4)", label: "Epic" },
  legendary: { color: "#F59E0B", glow: "rgba(245, 158, 11, 0.5)", label: "Legendary" }
};

// Particle background
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${4 + (i % 4) * 2}px`,
            height: `${4 + (i % 4) * 2}px`,
            left: `${(i * 5) % 100}%`,
            top: `${(i * 7) % 100}%`,
            background: i % 2 === 0 ? '#FFD700' : '#A855F7',
            animation: `particle-float ${6 + (i % 4)}s ease-in-out infinite ${i * 0.3}s`
          }}
        />
      ))}
    </div>
  );
}

export default function Shop() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [coins, setCoins] = useState(0);
  const [ownedItems, setOwnedItems] = useState([]);
  const [ownedAssets, setOwnedAssets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [purchasing, setPurchasing] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!user?.address) return;
      try {
        const profileRes = await fetch(`https://duelcraft-backend.onrender.com/profile?address=${user.address}`);
        const profileData = await profileRes.json();
        setCoins(profileData.coins || 0);
        setOwnedItems(profileData.ownedSkins || []);
        setOwnedAssets(profileData.ownedAssets || []);

        const assetsRes = await fetch("https://duelcraft-backend.onrender.com/api/assets");
        const assetsData = await assetsRes.json();
        const purchasableAssets = (assetsData.assets || [])
          .filter(a => a.price > 0 && a.isActive !== false)
          .map(a => ({
            id: a.assetId, assetId: a.assetId, name: a.name, category: a.category,
            price: a.price, preview: a.url ? null : CATEGORY_ICONS[a.category] || "❓",
            imageUrl: a.url, rarity: a.rarity || "common", isAsset: true
          }));
        setAssets(purchasableAssets);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    loadData();
  }, [user]);

  const isOwned = (item) => {
    if (item.isAsset) return ownedAssets.includes(item.assetId);
    return ownedItems.includes(item.id);
  };

  const purchaseItem = async (item) => {
    if (!user?.address) {
      setMessage({ type: "error", text: "Please connect your wallet first!" });
      return;
    }
    if (coins < item.price) {
      setMessage({ type: "error", text: "Not enough coins!" });
      return;
    }
    if (isOwned(item)) {
      setMessage({ type: "info", text: "You already own this item!" });
      return;
    }

    setPurchasing(item.id);
    try {
      let res, data;

      if (item.isAsset) {
        res = await fetch("https://duelcraft-backend.onrender.com/api/assets/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: user.address, assetId: item.assetId }),
        });
        data = await res.json();
        if (res.ok && data.ok) {
          setCoins(data.newBalance);
          setOwnedAssets(data.ownedAssets || [...ownedAssets, item.assetId]);
          setMessage({ type: "success", text: `🎉 Purchased ${item.name}!` });
        } else {
          setMessage({ type: "error", text: data.error || "Purchase failed" });
        }
      } else {
        res = await fetch("https://duelcraft-backend.onrender.com/shop/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: user.address, itemId: item.id, price: item.price }),
        });
        data = await res.json();
        if (res.ok && (data.ok || data.success)) {
          setCoins(data.newBalance);
          setOwnedItems(data.ownedSkins || [...ownedItems, item.id]);
          setMessage({ type: "success", text: `🎉 Purchased ${item.name}!` });
        } else {
          setMessage({ type: "error", text: data.error || "Purchase failed" });
        }
      }

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setPurchasing(null);
    }
  };

  const allItems = [...assets, ...LEGACY_SHOP_ITEMS];
  const filteredItems = selectedCategory === "all" ? allItems : allItems.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Armory Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/assets/background/armory.png)',
          backgroundPosition: 'center bottom'
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/40" />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Floating gold particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${3 + (i % 3) * 2}px`,
              height: `${3 + (i % 3) * 2}px`,
              left: `${(i * 6) % 100}%`,
              top: `${(i * 8) % 100}%`,
              background: i % 2 === 0 ? '#FFD700' : '#FFA500',
              opacity: 0.4,
              boxShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
              animation: `particle-float ${5 + (i % 4)}s ease-in-out infinite ${i * 0.3}s`
            }}
          />
        ))}
      </div>

      <div className={`max-w-7xl mx-auto px-4 py-8 relative z-10 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-black mb-2 font-display text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500"
              style={{ textShadow: "0 0 40px rgba(255, 215, 0, 0.3)" }}>
              🛒 ARMORY
            </h1>
            <p className="text-white/70 font-semibold">Customize your fighter with unique items!</p>
          </div>

          {/* Coins display */}
          <div className="relative bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-yellow-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="text-4xl drop-shadow-lg relative z-10">🪙</span>
            <div className="relative z-10">
              <div className="text-3xl font-black text-white font-display">{coins}</div>
              <div className="text-xs font-bold text-yellow-100">Your Gold</div>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl border-2 font-bold shadow-2xl animate-bounce-in flex items-center gap-3 ${message.type === "success" ? "bg-green-500/90 border-green-400 text-white"
            : message.type === "error" ? "bg-red-500/90 border-red-400 text-white"
              : "bg-blue-500/90 border-blue-400 text-white"
            }`} style={{ backdropFilter: "blur(10px)" }}>
            <span>{message.type === "success" ? "✅" : message.type === "error" ? "❌" : "ℹ️"}</span>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 px-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all duration-300 ${selectedCategory === cat.id
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg scale-105 border-2 border-amber-400"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border-2 border-white/10"
                }`}
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤷</div>
            <h3 className="text-2xl font-black text-white mb-2 font-display">No Items Found</h3>
            <p className="text-white/60">Try selecting a different category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item, idx) => {
              const owned = isOwned(item);
              const canAfford = coins >= item.price;
              const rarityConfig = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl p-5 transition-all duration-300 hover:scale-105 hover:-translate-y-2 overflow-hidden group ${owned ? "ring-4 ring-green-500" : ""}`}
                  style={{
                    background: "linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.90) 100%)",
                    border: `2px solid ${rarityConfig.color}60`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${rarityConfig.glow}`,
                    animationDelay: `${idx * 50}ms`
                  }}
                >
                  {/* Rarity glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${rarityConfig.glow}, transparent 70%)` }} />

                  {/* Item preview */}
                  <div className="relative text-6xl text-center mb-4 py-8 rounded-xl overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)" }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-20 object-contain" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span className="drop-shadow-lg">{item.preview}</span>
                    )}

                    {/* Rarity badge */}
                    <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-black text-white capitalize"
                      style={{ backgroundColor: rarityConfig.color }}>
                      {rarityConfig.label}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white mb-1 font-display">{item.name}</h3>
                  <p className="text-sm text-white/50 capitalize font-semibold mb-4">{item.category}</p>

                  {/* Price and action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🪙</span>
                      <span className={`font-black text-lg ${canAfford ? "text-amber-400" : "text-red-400"}`}>
                        {item.price}
                      </span>
                    </div>

                    {owned ? (
                      <span className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-black">✓ OWNED</span>
                    ) : (
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford || purchasing === item.id}
                        className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${canAfford
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 shadow-lg hover:shadow-amber-500/30 hover:scale-105"
                          : "bg-white/10 text-white/40 cursor-not-allowed"
                          }`}
                      >
                        {purchasing === item.id ? "..." : "BUY"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back button */}
        <div className="mt-12 text-center">
          <Link to="/hub">
            <button className="px-8 py-4 font-bold text-white rounded-2xl transition-all hover:scale-105 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-xl border-2 border-purple-400/50 font-display">
              ← Back to Hub
            </button>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-30px) translateX(15px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
