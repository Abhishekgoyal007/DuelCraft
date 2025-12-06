// src/pages/Shop.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

// Legacy shop items (skins, emotes etc)
const LEGACY_SHOP_ITEMS = [
  // Special effects (future)
  { id: "effect_fire", name: "Fire Aura", category: "effects", price: 200, preview: "🔥", special: true },
  { id: "effect_ice", name: "Ice Trail", category: "effects", price: 200, preview: "❄️", special: true },
  { id: "effect_lightning", name: "Lightning Spark", category: "effects", price: 250, preview: "⚡", special: true },
  
  // Emotes
  { id: "emote_dance", name: "Victory Dance", category: "emotes", price: 80, preview: "💃" },
  { id: "emote_taunt", name: "Taunt", category: "emotes", price: 50, preview: "😤" },
  { id: "emote_wave", name: "Wave", category: "emotes", price: 30, preview: "👋" },
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

// Category icons for asset preview
const CATEGORY_ICONS = {
  body: "🧍",
  hair: "💇",
  eyes: "👀",
  mouth: "👄",
  tops: "👕",
  bottoms: "👖",
  shoes: "👟",
  effect: "✨",
  accessory: "🎩",
  background: "🖼️",
  effects: "✨",
  emotes: "🎭"
};

export default function Shop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [coins, setCoins] = useState(0);
  const [ownedItems, setOwnedItems] = useState([]); // Legacy ownedSkins
  const [ownedAssets, setOwnedAssets] = useState([]); // New asset system
  const [assets, setAssets] = useState([]); // Purchasable assets from API
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [purchasing, setPurchasing] = useState(null);
  const [message, setMessage] = useState(null);

  // Load player data and assets
  useEffect(() => {
    async function loadData() {
      if (!user?.address) return;
      try {
        // Load player profile
        const profileRes = await fetch(`http://localhost:4000/profile?address=${user.address}`);
        const profileData = await profileRes.json();
        setCoins(profileData.coins || 0);
        setOwnedItems(profileData.ownedSkins || []);
        setOwnedAssets(profileData.ownedAssets || []);
        
        // Load purchasable assets (price > 0)
        const assetsRes = await fetch("http://localhost:4000/api/assets");
        const assetsData = await assetsRes.json();
        const purchasableAssets = (assetsData.assets || [])
          .filter(a => a.price > 0 && a.isActive !== false)
          .map(a => ({
            id: a.assetId,
            assetId: a.assetId,
            name: a.name,
            category: a.category,
            price: a.price,
            preview: a.url ? null : CATEGORY_ICONS[a.category] || "❓",
            imageUrl: a.url,
            rarity: a.rarity,
            isAsset: true // Flag to use asset purchase endpoint
          }));
        setAssets(purchasableAssets);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    loadData();
  }, [user]);

  // Check if item/asset is owned
  const isOwned = (item) => {
    if (item.isAsset) {
      return ownedAssets.includes(item.assetId);
    }
    return ownedItems.includes(item.id);
  };

  // Purchase item (legacy) or asset (new)
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
        // New asset purchase endpoint
        res = await fetch("http://localhost:4000/api/assets/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            address: user.address, 
            assetId: item.assetId
          }),
        });
        data = await res.json();
        
        if (res.ok && data.ok) {
          setCoins(data.newBalance);
          setOwnedAssets(data.ownedAssets || [...ownedAssets, item.assetId]);
          setMessage({ type: "success", text: `🎉 Successfully purchased ${item.name}!` });
        } else {
          setMessage({ type: "error", text: data.error || "Purchase failed" });
        }
      } else {
        // Legacy shop purchase endpoint
        res = await fetch("http://localhost:4000/shop/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            address: user.address, 
            itemId: item.id,
            price: item.price 
          }),
        });
        data = await res.json();
        
        if (res.ok && (data.ok || data.success)) {
          setCoins(data.newBalance);
          setOwnedItems(data.ownedSkins || [...ownedItems, item.id]);
          setMessage({ type: "success", text: `🎉 Successfully purchased ${item.name}!` });
        } else {
          setMessage({ type: "error", text: data.error || "Purchase failed" });
        }
      }
      
      // Auto-hide success message
      if (message?.type === "success") {
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setPurchasing(null);
    }
  };

  // Combine legacy items and assets
  const allItems = [...assets, ...LEGACY_SHOP_ITEMS];
  
  // Filter items by category
  const filteredItems = selectedCategory === "all" 
    ? allItems 
    : allItems.filter(item => item.category === selectedCategory);

  // Rarity colors
  const getRarityColor = (rarity) => {
    const colors = {
      common: "#9CA3AF",
      uncommon: "#22C55E", 
      rare: "#3B82F6",
      epic: "#A855F7",
      legendary: "#F59E0B"
    };
    return colors[rarity] || colors.common;
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(180deg, #87CEEB 0%, #98D8E8 30%, #B8E6B8 60%, #90EE90 100%)" }}>
      <Navbar />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-12 bg-white rounded-full opacity-80" />
      <div className="absolute top-32 right-20 w-32 h-16 bg-white rounded-full opacity-70" />
      <div className="absolute top-16 right-40 w-16 h-10 bg-white rounded-full opacity-90" />
      
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-green-600" />
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-amber-800" />
      
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center md:text-left">
            <h1 
              className="text-5xl font-black mb-2"
              style={{
                textShadow: "4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
                color: "#FFD700"
              }}
            >
              🛒 SHOP
            </h1>
            <p className="text-amber-800 font-bold">Customize your fighter with unique items!</p>
          </div>
          
          {/* Coins display */}
          <div 
            className="px-8 py-4 rounded-xl shadow-lg flex items-center gap-3"
            style={{
              background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)",
              border: "4px solid #B8860B",
              boxShadow: "0 6px 0 #8B6914"
            }}
          >
            <span className="text-4xl">🪙</span>
            <div>
              <div className="text-3xl font-black text-amber-900">{coins}</div>
              <div className="text-xs font-bold text-amber-700">Your Balance</div>
            </div>
          </div>
        </div>

        {/* Success/Error Popup */}
        {message && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-5 rounded-2xl border-4 font-black text-lg shadow-2xl animate-bounce-in ${
            message.type === "success" 
              ? "bg-gradient-to-r from-green-400 to-emerald-500 border-green-600 text-white" 
              : message.type === "error" 
                ? "bg-gradient-to-r from-red-400 to-red-500 border-red-600 text-white" 
                : "bg-gradient-to-r from-blue-400 to-blue-500 border-blue-600 text-white"
          }`} style={{ boxShadow: "0 8px 0 rgba(0,0,0,0.3)" }}>
            <span className="mr-3">{message.type === "success" ? "✅" : message.type === "error" ? "❌" : "ℹ️"}</span>
            {message.text}
            <button 
              onClick={() => setMessage(null)} 
              className="ml-4 opacity-80 hover:opacity-100 transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Categories - wooden sign style */}
        <div 
          className="flex gap-3 mb-8 overflow-x-auto pb-2 px-4 py-3 rounded-xl"
          style={{
            background: "linear-gradient(180deg, #8B4513 0%, #654321 100%)",
            border: "4px solid #3D2914",
          }}
        >
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-3 rounded-lg font-black whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-amber-400 text-amber-900 shadow-lg"
                  : "bg-amber-900/50 text-amber-100 hover:bg-amber-800/50"
              }`}
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => {
            const owned = isOwned(item);
            const canAfford = coins >= item.price;
            
            return (
              <div 
                key={item.id}
                className={`rounded-2xl p-5 transition-all hover:scale-105 hover:-translate-y-1 ${
                  owned ? "ring-4 ring-green-500" : ""
                }`}
                style={{
                  background: "linear-gradient(180deg, #fff 0%, #f0f0f0 100%)",
                  border: `4px solid ${item.rarity ? getRarityColor(item.rarity) : '#ccc'}`,
                  boxShadow: "0 6px 0 #999, 0 8px 20px rgba(0,0,0,0.2)"
                }}
              >
                {/* Item preview */}
                <div 
                  className="text-6xl text-center mb-4 py-6 rounded-xl relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #e0f0ff 0%, #c0e0ff 100%)" }}
                >
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-20 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    item.preview
                  )}
                  {/* Rarity badge */}
                  {item.rarity && (
                    <div 
                      className="absolute top-1 right-1 px-2 py-0.5 rounded text-xs font-bold text-white capitalize"
                      style={{ backgroundColor: getRarityColor(item.rarity) }}
                    >
                      {item.rarity}
                    </div>
                  )}
                </div>
                
                {/* Item info */}
                <h3 className="text-lg font-black text-gray-800 mb-1">{item.name}</h3>
                <p className="text-sm text-gray-500 capitalize font-bold mb-3">{item.category}</p>
                
                {/* Price and action */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xl">🪙</span>
                    <span className={`font-black text-lg ${canAfford ? "text-amber-600" : "text-red-500"}`}>
                      {item.price}
                    </span>
                  </div>
                  
                  {owned ? (
                    <span className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-black">
                      ✓ OWNED
                    </span>
                  ) : (
                    <button
                      onClick={() => purchaseItem(item)}
                      disabled={!canAfford || purchasing === item.id}
                      className={`px-4 py-2 rounded-lg font-black text-sm transition-all ${
                        canAfford
                          ? "bg-gradient-to-b from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700 shadow-md"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      style={canAfford ? { boxShadow: "0 3px 0 #166534" } : {}}
                    >
                      {purchasing === item.id ? "..." : "BUY"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => navigate("/hub")}
            className="px-8 py-4 font-black text-amber-900 rounded-xl transition hover:scale-105"
            style={{
              background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)",
              border: "4px solid #B8860B",
              boxShadow: "0 4px 0 #8B6914"
            }}
          >
            ← Back to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
