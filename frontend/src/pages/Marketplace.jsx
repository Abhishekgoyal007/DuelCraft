import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import Navbar from "../components/Navbar";

const CATEGORIES = [
  { id: "all", name: "All Items", icon: "🛒" },
  { id: "skins", name: "Skins", icon: "🎨" },
  { id: "effects", name: "Effects", icon: "✨" },
  { id: "emotes", name: "Emotes", icon: "🎭" },
  { id: "accessories", name: "Accessories", icon: "👑" }
];

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
  const [activeTab, setActiveTab] = useState("browse"); // browse, my-listings, list-item
  
  // List item form
  const [listForm, setListForm] = useState({
    tokenId: "",
    price: "",
    forSale: true,
    forRent: false,
    rentDuration: "7",
    rentPrice: ""
  });

  // Load marketplace listings
  useEffect(() => {
    const loadListings = async () => {
      if (!contracts?.marketplace || !isConnected) return;
      
      setLoading(true);
      try {
        // Get all active listings (mock for now - implement pagination)
        const mockListings = [
          {
            id: "1",
            seller: "0x1234...5678",
            itemName: "Fire Sword Skin",
            category: "skins",
            price: "50",
            forRent: true,
            rentPrice: "5",
            rentDuration: "7",
            image: "🔥⚔️",
            rarity: "epic"
          },
          {
            id: "2",
            seller: "0x8765...4321",
            itemName: "Lightning Effect",
            category: "effects",
            price: "100",
            forRent: false,
            image: "⚡✨",
            rarity: "legendary"
          }
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

  // Load user's listings
  useEffect(() => {
    const loadMyListings = async () => {
      if (!user?.address || !contracts?.marketplace) return;
      
      try {
        // Fetch user's active listings from blockchain
        // For now, using mock data
        const mockMyListings = [];
        setMyListings(mockMyListings);
      } catch (error) {
        console.error('Error loading my listings:', error);
      }
    };
    
    loadMyListings();
  }, [user?.address, contracts]);

  const handleBuyItem = async (listing) => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (!isCorrectChain) {
      await switchToMantleNetwork();
      return;
    }

    try {
      setMessage({ type: "info", text: "Processing purchase..." });
      
      // Approve ARENA tokens
      const priceInWei = BigInt(parseFloat(listing.price) * 1e18);
      const approveTx = await contracts.token.approve(
        await contracts.marketplace.getAddress(),
        priceInWei
      );
      await approveTx.wait();

      // Buy item
      const buyTx = await contracts.marketplace.buyItem(listing.id);
      await buyTx.wait();

      setMessage({ 
        type: "success", 
        text: `🎉 Successfully purchased ${listing.itemName}!` 
      });
      
      // Reload listings
      setTimeout(() => {
        setMessage(null);
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Purchase error:', error);
      setMessage({ 
        type: "error", 
        text: error.message || "Purchase failed" 
      });
    }
  };

  const handleRentItem = async (listing) => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (!isCorrectChain) {
      await switchToMantleNetwork();
      return;
    }

    try {
      setMessage({ type: "info", text: "Processing rental..." });
      
      // Approve ARENA tokens for rental
      const rentPriceInWei = BigInt(parseFloat(listing.rentPrice) * 1e18);
      const approveTx = await contracts.token.approve(
        await contracts.marketplace.getAddress(),
        rentPriceInWei
      );
      await approveTx.wait();

      // Rent item
      const rentTx = await contracts.marketplace.rentItem(listing.id, listing.rentDuration);
      await rentTx.wait();

      setMessage({ 
        type: "success", 
        text: `🎉 Successfully rented ${listing.itemName} for ${listing.rentDuration} days!` 
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Rental error:', error);
      setMessage({ 
        type: "error", 
        text: error.message || "Rental failed" 
      });
    }
  };

  const handleListItem = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      await connect();
      return;
    }

    if (!isCorrectChain) {
      await switchToMantleNetwork();
      return;
    }

    try {
      setMessage({ type: "info", text: "Listing item on marketplace..." });
      
      // Approve NFT transfer
      const approveTx = await contracts.character.approve(
        await contracts.marketplace.getAddress(),
        listForm.tokenId
      );
      await approveTx.wait();

      // List item
      const priceInWei = BigInt(parseFloat(listForm.price) * 1e18);
      const rentPriceInWei = listForm.forRent 
        ? BigInt(parseFloat(listForm.rentPrice) * 1e18) 
        : 0n;

      const listTx = await contracts.marketplace.listItem(
        listForm.tokenId,
        priceInWei,
        listForm.forRent,
        rentPriceInWei,
        parseInt(listForm.rentDuration)
      );
      await listTx.wait();

      setMessage({ 
        type: "success", 
        text: "🎉 Item listed successfully!" 
      });
      
      setShowListModal(false);
      setListForm({
        tokenId: "",
        price: "",
        forSale: true,
        forRent: false,
        rentDuration: "7",
        rentPrice: ""
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Listing error:', error);
      setMessage({ 
        type: "error", 
        text: error.message || "Failed to list item" 
      });
    }
  };

  const filteredListings = selectedCategory === "all" 
    ? listings 
    : listings.filter(l => l.category === selectedCategory);

  const getRarityColor = (rarity) => {
    const colors = {
      common: "bg-gray-400",
      uncommon: "bg-green-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-orange-500"
    };
    return colors[rarity] || colors.common;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <Navbar />
      
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-400 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-6xl font-black mb-4"
            style={{
              textShadow: "4px 4px 0 #000",
              color: "#00F0FF"
            }}
          >
            🏪 MARKETPLACE
          </h1>
          <p className="text-cyan-200 text-lg font-bold">Trade & Rent Cosmetic NFTs</p>
        </div>

        {/* Message notification */}
        {message && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-5 rounded-2xl border-4 font-black text-lg shadow-2xl ${
            message.type === "success" 
              ? "bg-green-500 border-green-600 text-white" 
              : message.type === "error" 
                ? "bg-red-500 border-red-600 text-white" 
                : "bg-blue-500 border-blue-600 text-white"
          }`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-4">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-8 py-4 rounded-xl font-black text-lg transition-all ${
              activeTab === "browse"
                ? "bg-cyan-500 text-white shadow-lg scale-105"
                : "bg-white/10 text-cyan-200 hover:bg-white/20"
            }`}
          >
            🛒 Browse
          </button>
          <button
            onClick={() => setActiveTab("my-listings")}
            className={`px-8 py-4 rounded-xl font-black text-lg transition-all ${
              activeTab === "my-listings"
                ? "bg-cyan-500 text-white shadow-lg scale-105"
                : "bg-white/10 text-cyan-200 hover:bg-white/20"
            }`}
          >
            📋 My Listings
          </button>
          <button
            onClick={() => setShowListModal(true)}
            className="px-8 py-4 rounded-xl font-black text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition shadow-lg"
          >
            ➕ List Item
          </button>
        </div>

        {/* Browse Tab */}
        {activeTab === "browse" && (
          <>
            {/* Categories */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2 justify-center">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-3 rounded-lg font-black whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-cyan-500 text-white shadow-lg"
                      : "bg-white/10 text-cyan-200 hover:bg-white/20"
                  }`}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="text-center py-20 text-cyan-200 text-xl font-bold">
                Loading marketplace...
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-2xl font-black text-white mb-2">No Items Listed</h3>
                <p className="text-cyan-300">Be the first to list an item!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map(listing => (
                  <div 
                    key={listing.id}
                    className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-4 border-white/20 hover:border-cyan-400 transition-all hover:scale-105"
                  >
                    {/* Item preview */}
                    <div className="text-6xl text-center mb-4 py-8 bg-white/5 rounded-xl">
                      {listing.image}
                    </div>
                    
                    {/* Rarity badge */}
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-black text-white mb-3 ${getRarityColor(listing.rarity)}`}>
                      {listing.rarity.toUpperCase()}
                    </div>
                    
                    {/* Item info */}
                    <h3 className="text-xl font-black text-white mb-2">{listing.itemName}</h3>
                    <p className="text-sm text-cyan-300 mb-4">Seller: {listing.seller}</p>
                    
                    {/* Prices */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <span className="text-cyan-200 text-sm font-bold">Buy Price:</span>
                        <span className="text-white font-black">{listing.price} 💎 ARENA</span>
                      </div>
                      
                      {listing.forRent && (
                        <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <span className="text-cyan-200 text-sm font-bold">Rent ({listing.rentDuration}d):</span>
                          <span className="text-white font-black">{listing.rentPrice} 💎 ARENA</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBuyItem(listing)}
                        className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black hover:from-green-600 hover:to-emerald-700 transition"
                      >
                        BUY
                      </button>
                      {listing.forRent && (
                        <button
                          onClick={() => handleRentItem(listing)}
                          className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-black hover:from-blue-600 hover:to-cyan-700 transition"
                        >
                          RENT
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* My Listings Tab */}
        {activeTab === "my-listings" && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-4 border-white/20">
            {myListings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-black text-white mb-2">No Active Listings</h3>
                <p className="text-cyan-300 mb-6">List your items to start trading!</p>
                <button
                  onClick={() => setShowListModal(true)}
                  className="px-8 py-4 rounded-xl font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition"
                >
                  ➕ List an Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myListings.map(listing => (
                  <div key={listing.id} className="bg-white/5 rounded-xl p-4">
                    {/* Display user's listings */}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List Item Modal */}
        {showListModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full border-4 border-cyan-500 shadow-2xl">
              <h2 className="text-3xl font-black text-white mb-6">📝 List Item</h2>
              
              <form onSubmit={handleListItem} className="space-y-4">
                <div>
                  <label className="text-cyan-200 font-bold mb-2 block">Token ID</label>
                  <input
                    type="number"
                    value={listForm.tokenId}
                    onChange={(e) => setListForm({...listForm, tokenId: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border-2 border-cyan-500 focus:border-cyan-300 outline-none"
                    placeholder="Enter NFT Token ID"
                    required
                  />
                </div>

                <div>
                  <label className="text-cyan-200 font-bold mb-2 block">Sale Price (ARENA)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={listForm.price}
                    onChange={(e) => setListForm({...listForm, price: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border-2 border-cyan-500 focus:border-cyan-300 outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={listForm.forRent}
                    onChange={(e) => setListForm({...listForm, forRent: e.target.checked})}
                    className="w-5 h-5"
                  />
                  <label className="text-cyan-200 font-bold">Also available for rent</label>
                </div>

                {listForm.forRent && (
                  <>
                    <div>
                      <label className="text-cyan-200 font-bold mb-2 block">Rent Price/Day (ARENA)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={listForm.rentPrice}
                        onChange={(e) => setListForm({...listForm, rentPrice: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border-2 border-cyan-500 focus:border-cyan-300 outline-none"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="text-cyan-200 font-bold mb-2 block">Rent Duration (days)</label>
                      <select
                        value={listForm.rentDuration}
                        onChange={(e) => setListForm({...listForm, rentDuration: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border-2 border-cyan-500 outline-none"
                      >
                        <option value="1">1 Day</option>
                        <option value="7">7 Days</option>
                        <option value="30">30 Days</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowListModal(false)}
                    className="flex-1 py-3 rounded-lg bg-gray-600 text-white font-black hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black hover:from-green-600 hover:to-emerald-700 transition"
                  >
                    List Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate("/hub")}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-xl hover:from-cyan-600 hover:to-blue-700 transition shadow-xl border-4 border-cyan-400"
          >
            ← Back to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
