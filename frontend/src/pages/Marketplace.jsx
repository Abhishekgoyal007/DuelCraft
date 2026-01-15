import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { FloatingNav } from "../components/FloatingNav";

const CATEGORIES = [
  { id: "all", name: "All Items", icon: "🛒" },
  { id: "skins", name: "Skins", icon: "🎨" },
  { id: "effects", name: "Effects", icon: "✨" },
  { id: "emotes", name: "Emotes", icon: "🎭" },
  { id: "accessories", name: "Accessories", icon: "👑" }
];

const RARITY_CONFIG = {
  common: { color: "#9CA3AF", gradient: "from-gray-400 to-gray-600" },
  uncommon: { color: "#22C55E", gradient: "from-green-400 to-green-600" },
  rare: { color: "#3B82F6", gradient: "from-blue-400 to-blue-600" },
  epic: { color: "#A855F7", gradient: "from-purple-400 to-purple-600" },
  legendary: { color: "#F59E0B", gradient: "from-amber-400 to-orange-600" }
};

export default function Marketplace() {
  const { user } = useAuth();
  const { contracts, isConnected, connect, isCorrectChain, switchToMantleNetwork } = useWeb3();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [isLoaded, setIsLoaded] = useState(false);

  const [listForm, setListForm] = useState({
    tokenId: "", price: "", forSale: true, forRent: false, rentDuration: "7", rentPrice: ""
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const loadListings = async () => {
      if (!contracts?.marketplace || !isConnected) return;

      setLoading(true);
      try {
        const mockListings = [
          { id: "1", seller: "0x1234...5678", itemName: "Fire Sword Skin", category: "skins", price: "50", forRent: true, rentPrice: "5", rentDuration: "7", image: "🔥⚔️", rarity: "epic" },
          { id: "2", seller: "0x8765...4321", itemName: "Lightning Effect", category: "effects", price: "100", forRent: false, image: "⚡✨", rarity: "legendary" },
          { id: "3", seller: "0xABCD...EFGH", itemName: "Shadow Cloak", category: "skins", price: "75", forRent: true, rentPrice: "8", rentDuration: "7", image: "🌑👤", rarity: "rare" },
        ];
        setListings(mockListings);
      } catch (error) {
        console.error('Error loading listings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, [contracts, isConnected]);

  useEffect(() => {
    const loadMyListings = async () => {
      if (!user?.address || !contracts?.marketplace) return;
      try {
        const mockMyListings = [];
        setMyListings(mockMyListings);
      } catch (error) {
        console.error('Error loading my listings:', error);
      }
    };
    loadMyListings();
  }, [user?.address, contracts]);

  const handleBuyItem = async (listing) => {
    if (!isConnected) { await connect(); return; }
    if (!isCorrectChain) { await switchToMantleNetwork(); return; }

    try {
      setMessage({ type: "info", text: "Processing purchase..." });
      const priceInWei = BigInt(parseFloat(listing.price) * 1e18);
      const approveTx = await contracts.token.approve(await contracts.marketplace.getAddress(), priceInWei);
      await approveTx.wait();
      const buyTx = await contracts.marketplace.buyItem(listing.id);
      await buyTx.wait();
      setMessage({ type: "success", text: `🎉 Purchased ${listing.itemName}!` });
      setTimeout(() => { setMessage(null); window.location.reload(); }, 2000);
    } catch (error) {
      console.error('Purchase error:', error);
      setMessage({ type: "error", text: error.message || "Purchase failed" });
    }
  };

  const handleRentItem = async (listing) => {
    if (!isConnected) { await connect(); return; }
    if (!isCorrectChain) { await switchToMantleNetwork(); return; }

    try {
      setMessage({ type: "info", text: "Processing rental..." });
      const rentPriceInWei = BigInt(parseFloat(listing.rentPrice) * 1e18);
      const approveTx = await contracts.token.approve(await contracts.marketplace.getAddress(), rentPriceInWei);
      await approveTx.wait();
      const rentTx = await contracts.marketplace.rentItem(listing.id, listing.rentDuration);
      await rentTx.wait();
      setMessage({ type: "success", text: `🎉 Rented ${listing.itemName} for ${listing.rentDuration} days!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Rental error:', error);
      setMessage({ type: "error", text: error.message || "Rental failed" });
    }
  };

  const handleListItem = async (e) => {
    e.preventDefault();
    if (!isConnected) { await connect(); return; }
    if (!isCorrectChain) { await switchToMantleNetwork(); return; }

    try {
      setMessage({ type: "info", text: "Listing item..." });
      const approveTx = await contracts.character.approve(await contracts.marketplace.getAddress(), listForm.tokenId);
      await approveTx.wait();
      const priceInWei = BigInt(parseFloat(listForm.price) * 1e18);
      const rentPriceInWei = listForm.forRent ? BigInt(parseFloat(listForm.rentPrice) * 1e18) : 0n;
      const listTx = await contracts.marketplace.listItem(listForm.tokenId, priceInWei, listForm.forRent, rentPriceInWei, parseInt(listForm.rentDuration));
      await listTx.wait();
      setMessage({ type: "success", text: "🎉 Item listed!" });
      setShowListModal(false);
      setListForm({ tokenId: "", price: "", forSale: true, forRent: false, rentDuration: "7", rentPrice: "" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Listing error:', error);
      setMessage({ type: "error", text: error.message || "Failed to list" });
    }
  };

  const filteredListings = selectedCategory === "all" ? listings : listings.filter(l => l.category === selectedCategory);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Bazaar Background Image - sized to fit the sign */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: 'url(/assets/background/bazaar.png)',
          backgroundSize: '100% auto',
          backgroundPosition: 'center top'
        }}
      />

      {/* Dark overlay - lighter at top to show title, darker at bottom for content */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/20" />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + (i % 3) * 2}px`,
              height: `${2 + (i % 3) * 2}px`,
              left: `${(i * 5) % 100}%`,
              top: `${(i * 7) % 100}%`,
              background: i % 2 === 0 ? '#FFD700' : '#A855F7',
              opacity: 0.5,
              boxShadow: `0 0 8px ${i % 2 === 0 ? 'rgba(255,215,0,0.6)' : 'rgba(168,85,247,0.6)'}`,
              animation: `particle-float ${6 + (i % 4)}s ease-in-out infinite ${i * 0.3}s`
            }}
          />
        ))}
      </div>

      <div className={`max-w-7xl mx-auto px-4 pt-28 pb-8 relative z-10 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        {/* Header space - title is in background image */}

        {/* Message toast */}
        {message && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl border-2 font-bold shadow-2xl animate-bounce-in flex items-center gap-3 backdrop-blur-lg ${message.type === "success" ? "bg-green-500/90 border-green-400"
            : message.type === "error" ? "bg-red-500/90 border-red-400"
              : "bg-blue-500/90 border-blue-400"
            } text-white`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 justify-center flex-wrap">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${activeTab === "browse"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-105 border-2 border-cyan-400"
              : "bg-white/5 text-cyan-300 hover:bg-white/10 border-2 border-white/10"
              }`}
          >
            🛒 Browse
          </button>
          <button
            onClick={() => setActiveTab("my-listings")}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${activeTab === "my-listings"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-105 border-2 border-cyan-400"
              : "bg-white/5 text-cyan-300 hover:bg-white/10 border-2 border-white/10"
              }`}
          >
            📋 My Listings
          </button>
          <button
            onClick={() => setShowListModal(true)}
            className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/30 border-2 border-green-400 hover:scale-105"
          >
            ➕ List Item
          </button>
        </div>

        {/* Browse Tab */}
        {activeTab === "browse" && (
          <>
            {/* Categories */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2 justify-center flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all duration-300 ${selectedCategory === cat.id
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg border-2 border-cyan-400"
                    : "bg-white/5 text-cyan-300/70 hover:bg-white/10 hover:text-cyan-200 border-2 border-white/10"
                    }`}
                >
                  <span className="mr-2">{cat.icon}</span>{cat.name}
                </button>
              ))}
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="text-center py-20 text-cyan-300 text-xl font-bold">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                Loading marketplace...
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-2xl font-black text-white mb-2 font-display">No Items Listed</h3>
                <p className="text-cyan-300/70">Be the first to list an item!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing, idx) => {
                  const rarity = RARITY_CONFIG[listing.rarity] || RARITY_CONFIG.common;
                  return (
                    <div
                      key={listing.id}
                      className="relative rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:-translate-y-2 overflow-hidden group"
                      style={{
                        background: "linear-gradient(145deg, rgba(15,30,54,0.95) 0%, rgba(26,15,46,0.92) 100%)",
                        border: `2px solid ${rarity.color}60`,
                        boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
                        animationDelay: `${idx * 100}ms`
                      }}
                    >
                      {/* Rarity glow */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity"
                        style={{ background: `radial-gradient(circle at 50% 0%, ${rarity.color}, transparent 70%)` }} />

                      {/* Item preview */}
                      <div className="text-6xl text-center mb-4 py-8 bg-white/5 rounded-xl">
                        {listing.image}
                      </div>

                      {/* Rarity badge */}
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-black text-white mb-3 bg-gradient-to-r ${rarity.gradient}`}>
                        {listing.rarity.toUpperCase()}
                      </div>

                      <h3 className="text-xl font-black text-white mb-2 font-display">{listing.itemName}</h3>
                      <p className="text-sm text-cyan-300/70 mb-4">Seller: {listing.seller}</p>

                      {/* Prices */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                          <span className="text-cyan-300 text-sm font-bold">Buy Price:</span>
                          <span className="text-white font-black font-display">{listing.price} 💎</span>
                        </div>
                        {listing.forRent && (
                          <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                            <span className="text-cyan-300 text-sm font-bold">Rent ({listing.rentDuration}d):</span>
                            <span className="text-white font-black font-display">{listing.rentPrice} 💎</span>
                          </div>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBuyItem(listing)}
                          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg hover:shadow-green-500/30"
                        >
                          BUY
                        </button>
                        {listing.forRent && (
                          <button
                            onClick={() => handleRentItem(listing)}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-black hover:from-blue-400 hover:to-cyan-500 transition-all shadow-lg hover:shadow-blue-500/30"
                          >
                            RENT
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* My Listings Tab */}
        {activeTab === "my-listings" && (
          <div className="rounded-2xl p-8 border-2 border-cyan-500/30" style={{ background: "linear-gradient(145deg, rgba(15,30,54,0.95) 0%, rgba(26,15,46,0.92) 100%)" }}>
            {myListings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-black text-white mb-2 font-display">No Active Listings</h3>
                <p className="text-cyan-300/70 mb-6">List your items to start trading!</p>
                <button
                  onClick={() => setShowListModal(true)}
                  className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 transition shadow-lg"
                >
                  ➕ List an Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myListings.map(listing => (
                  <div key={listing.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    {/* Display listings */}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List Modal */}
        {showListModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative max-w-md w-full rounded-3xl p-8 border-2 border-cyan-500/50 shadow-2xl overflow-hidden"
              style={{ background: "linear-gradient(145deg, #0f1e36 0%, #1a0f2e 100%)" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />

              <h2 className="text-3xl font-black text-white mb-6 font-display relative z-10">📝 List Item</h2>

              <form onSubmit={handleListItem} className="space-y-4 relative z-10">
                <div>
                  <label className="text-cyan-300 font-bold mb-2 block">Token ID</label>
                  <input
                    type="number"
                    value={listForm.tokenId}
                    onChange={(e) => setListForm({ ...listForm, tokenId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-cyan-500/50 focus:border-cyan-400 outline-none transition"
                    placeholder="Enter NFT Token ID"
                    required
                  />
                </div>

                <div>
                  <label className="text-cyan-300 font-bold mb-2 block">Sale Price (ARENA)</label>
                  <input
                    type="number" step="0.01"
                    value={listForm.price}
                    onChange={(e) => setListForm({ ...listForm, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-cyan-500/50 focus:border-cyan-400 outline-none transition"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={listForm.forRent}
                    onChange={(e) => setListForm({ ...listForm, forRent: e.target.checked })}
                    className="w-5 h-5 accent-cyan-500"
                  />
                  <label className="text-cyan-300 font-bold">Also available for rent</label>
                </div>

                {listForm.forRent && (
                  <>
                    <div>
                      <label className="text-cyan-300 font-bold mb-2 block">Rent Price/Day (ARENA)</label>
                      <input
                        type="number" step="0.01"
                        value={listForm.rentPrice}
                        onChange={(e) => setListForm({ ...listForm, rentPrice: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-cyan-500/50 focus:border-cyan-400 outline-none transition"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-cyan-300 font-bold mb-2 block">Rent Duration</label>
                      <select
                        value={listForm.rentDuration}
                        onChange={(e) => setListForm({ ...listForm, rentDuration: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-cyan-500/50 outline-none"
                      >
                        <option value="1">1 Day</option>
                        <option value="7">7 Days</option>
                        <option value="30">30 Days</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowListModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition border border-white/20">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:from-green-400 hover:to-emerald-500 transition shadow-lg">
                    List Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="text-center mt-12">
          <Link to="/hub">
            <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition shadow-xl border-2 border-cyan-400/50 hover:scale-105">
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
