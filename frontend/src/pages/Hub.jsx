import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useEffect, useState } from "react";

import { CHARACTER_LAYERS, LAYER_ORDER, DEFAULT_AVATAR } from "../config/characterConfig";
import { getCharacter, getCharacterImage, getCharacterName } from "../config/characters";

function AvatarPreview({ avatar }) {
  // Check if user has customized their avatar (not just defaults)
  const hasCustomAvatar = avatar && (
    avatar.body !== undefined || 
    avatar.hair !== undefined || 
    avatar.bodyColor || 
    avatar.hairColor
  );
  
  const finalAvatar = { ...DEFAULT_AVATAR, ...avatar };
  
  // Get colors
  const skinColor = finalAvatar.bodyColor || "#FFDBB5";
  const hairColor = finalAvatar.hairColor || "#3A3A3A";
  const topsColor = finalAvatar.topsColor || "#4A90D9";
  const bottomsColor = finalAvatar.bottomsColor || "#3A5A9A";

  return (
    <div 
      className="h-64 w-full rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #87CEEB 0%, #90EE90 100%)" }}
    >
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-500" />
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-green-700" />
      
      {!hasCustomAvatar ? (
        /* Ghost placeholder when no custom avatar */
        <div className="text-center relative z-10">
          <div className="relative mx-auto w-20 h-20 mb-3">
            {/* Ghost body */}
            <div className="w-20 h-20 bg-gray-300/60 rounded-full animate-pulse border-4 border-dashed border-gray-400"></div>
            {/* Question mark */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl text-gray-500">?</span>
            </div>
          </div>
          <p className="text-gray-600 font-bold text-sm">No fighter created yet!</p>
          <p className="text-gray-500 text-xs">Create your champion below</p>
        </div>
      ) : (
        /* Character */
        <div className="relative" style={{ transform: "scale(1.5)" }}>
          {/* Body */}
          <div 
            className="w-16 h-16 rounded-full relative"
            style={{ backgroundColor: skinColor }}
          >
            {/* Face */}
            <div className="absolute inset-2 rounded-full" style={{ backgroundColor: skinColor }}>
              {/* Eyes */}
              <div className="absolute top-3 left-2 w-2 h-2 bg-black rounded-full" />
              <div className="absolute top-3 right-2 w-2 h-2 bg-black rounded-full" />
              {/* Mouth */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-red-400 rounded-b-full" />
            </div>
            {/* Hair */}
            <div 
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-5 rounded-t-full"
              style={{ backgroundColor: hairColor }}
            />
          </div>
          {/* Shirt */}
          <div 
            className="w-14 h-8 mx-auto -mt-1 rounded-b-lg"
            style={{ backgroundColor: topsColor }}
          />
          {/* Legs */}
          <div className="flex justify-center gap-1 -mt-1">
            <div className="w-3 h-6 rounded-b" style={{ backgroundColor: bottomsColor }} />
            <div className="w-3 h-6 rounded-b" style={{ backgroundColor: bottomsColor }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Hub() {
  const { user } = useAuth();
  const { address, arenaBalance } = useWeb3();
  const [avatar, setAvatar] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [coins, setCoins] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });
  const [hasNFT, setHasNFT] = useState(false);
  const [nftTokenId, setNftTokenId] = useState(null);
  const [checkingNFT, setCheckingNFT] = useState(false);

  useEffect(() => {
    const doFetch = async () => {
      if (!user?.address) return;
      try {
        const res = await fetch(`http://localhost:4000/profile?address=${user.address}`);
        const data = await res.json();
        if (data?.avatar) setAvatar(data.avatar);
        if (data?.selectedCharacter) setSelectedCharacter(data.selectedCharacter);
        if (data?.coins !== undefined) setCoins(data.coins);
        if (data?.stats) setStats(data.stats);
      } catch (err) {
        console.warn(err);
      }
    };
    
    doFetch();
    
    // Refetch when user returns to this tab (e.g., after a match)
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300">

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex flex-col items-center justify-center h-screen overflow-hidden">
        {/* Stats bar */}
        {user && (
          <div className="mb-8 flex gap-4 justify-center animate-slide-down flex-wrap">
            {/* Arena Coins */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-yellow-600 transform hover:scale-110 transition-transform">
              <span className="text-3xl">🪙</span>
              <div>
                <div className="text-2xl font-black text-white drop-shadow-lg">{coins}</div>
                <div className="text-xs font-bold text-yellow-100">Arena Coins</div>
                <div className="text-[10px] text-yellow-200/90">Off-chain</div>
              </div>
            </div>

            {/* ARENA Tokens */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-purple-800 transform hover:scale-110 transition-transform">
              <span className="text-3xl">💎</span>
              <div>
                <div className="text-2xl font-black text-white drop-shadow-lg">{arenaBalance || '100001000.00'}</div>
                <div className="text-xs font-bold text-purple-100">ARENA Tokens</div>
                <div className="text-[10px] text-purple-200/90">On-chain</div>
              </div>
            </div>

            {/* Wins */}
            <div className="bg-gradient-to-br from-green-400 to-green-600 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-green-700 transform hover:scale-110 transition-transform">
              <span className="text-3xl">🏆</span>
              <div>
                <div className="text-2xl font-black text-white drop-shadow-lg">{stats.wins || 0}</div>
                <div className="text-xs font-bold text-green-100">Wins</div>
              </div>
            </div>

            {/* Losses */}
            <div className="bg-gradient-to-br from-red-400 to-red-600 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-red-700 transform hover:scale-110 transition-transform">
              <span className="text-3xl">💀</span>
              <div>
                <div className="text-2xl font-black text-white drop-shadow-lg">{stats.losses || 0}</div>
                <div className="text-xs font-bold text-red-100">Losses</div>
              </div>
            </div>
          </div>
        )}

        {/* Big Board Container */}
        <div 
          className="relative shadow-2xl w-full max-w-6xl animate-fade-in rounded-3xl border-8 border-amber-700"
          style={{
            background: 'linear-gradient(to bottom right, #FFF4E6, #FFE4B5, #FFEAA7)',
            minHeight: '600px',
            padding: '40px 60px'
          }}
        >
          <div className="flex gap-6 flex-col lg:flex-row">
            <div className="flex-1">
              <h2 className="text-4xl font-black text-amber-900 drop-shadow-lg mb-1" style={{ textShadow: "3px 3px 0px rgba(255,255,255,0.5)" }}>
                GAME HUB ⚔️
              </h2>
              <p className="text-amber-800 font-semibold text-base">Choose your destiny and battle!</p>

              {/* Main actions */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link to="/arena" className="group">
                  <div className="bg-gradient-to-br from-red-500 to-red-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-3 border-red-800 transform hover:-translate-y-2">
                    <div className="text-4xl mb-2 animate-pulse">⚔️</div>
                    <div className="text-xl font-black drop-shadow-md">PLAY NOW</div>
                    <div className="text-red-200 font-semibold text-sm">Jump into epic 1v1 battles!</div>
                  </div>
                </Link>
                
                <Link to="/creator" className="group">
                  <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-4 rounded-xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-3 border-yellow-700 transform hover:-translate-y-2">
                    <div className="text-4xl mb-2">✨</div>
                    <div className="text-xl font-black drop-shadow-md">CREATE FIGHTER</div>
                    <div className="text-yellow-200 font-semibold text-sm">Customize your champion!</div>
                  </div>
                </Link>
                
                <Link to="/shop" className="group">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-3 border-purple-800 transform hover:-translate-y-2">
                    <div className="text-4xl mb-2">🛒</div>
                    <div className="text-xl font-black drop-shadow-md">SHOP</div>
                    <div className="text-purple-200 font-semibold text-sm">Buy items & power-ups!</div>
                  </div>
                </Link>
                
                <Link to="/marketplace" className="group">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-3 border-blue-800 transform hover:-translate-y-2">
                    <div className="text-4xl mb-2">🏪</div>
                    <div className="text-xl font-black drop-shadow-md">MARKETPLACE</div>
                    <div className="text-cyan-200 font-semibold text-sm">Trade & rent NFTs!</div>
                  </div>
                </Link>
                
                <Link to="/tournament" className="group">
                  <div className="bg-gradient-to-br from-pink-500 to-purple-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-3 border-purple-800 transform hover:-translate-y-2">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-xl font-black drop-shadow-md">TOURNAMENT</div>
                    <div className="text-pink-200 font-semibold text-sm">Compete for big prizes!</div>
                  </div>
                </Link>
                
                <Link to="/season-pass" className="group">
                  <div className="bg-gradient-to-br from-indigo-500 to-violet-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-3 border-indigo-800 transform hover:-translate-y-2">
                    <div className="text-4xl mb-2">🎟️</div>
                    <div className="text-xl font-black drop-shadow-md">SEASON PASS</div>
                    <div className="text-indigo-200 font-semibold text-sm">Unlock bonus rewards!</div>
                  </div>
                </Link>
                
                <Link to="/leaderboard" className="group">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-3 border-green-800 transform hover:-translate-y-2">
                    <div className="text-4xl mb-2 animate-bounce">📊</div>
                    <div className="text-xl font-black drop-shadow-md">LEADERBOARD</div>
                    <div className="text-emerald-200 font-semibold text-sm">Top warriors worldwide!</div>
                  </div>
                </Link>
              </div>

              {/* Feature badges */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <div className="bg-white px-3 py-2 rounded-full shadow-lg border-2 border-slate-300 font-bold text-slate-700 text-xs flex items-center gap-1 hover:scale-105 transition-transform">
                  <span>📊</span> Leaderboards
                </div>
                <div className="bg-white px-3 py-2 rounded-full shadow-lg border-2 border-slate-300 font-bold text-slate-700 text-xs flex items-center gap-1 hover:scale-105 transition-transform">
                  <span>🪙</span> Token Rewards
                </div>
                <div className="bg-white px-3 py-2 rounded-full shadow-lg border-2 border-slate-300 font-bold text-slate-700 text-xs flex items-center gap-1 hover:scale-105 transition-transform">
                  <span>🎨</span> Custom Avatars
                </div>
                <div className="bg-white px-3 py-2 rounded-full shadow-lg border-2 border-slate-300 font-bold text-slate-700 text-xs flex items-center gap-1 hover:scale-105 transition-transform">
                  <span>⚡</span> Real-time PvP
                </div>
              </div>

              <div className="mt-3">
                <Link to="/modes">
                  <button className="w-full py-3 bg-white border-3 border-amber-700 rounded-xl text-amber-900 font-black text-base hover:bg-amber-50 transition shadow-xl hover:shadow-2xl transform hover:scale-105">
                    🎮 VIEW ALL GAME MODES
                  </button>
                </Link>
              </div>
            </div>

            {/* Avatar preview */}
            <div className="mt-0 w-full lg:w-72">
              <div className="text-base font-black text-amber-900 mb-2 drop-shadow">YOUR FIGHTER</div>
              {selectedCharacter ? (
                <div 
                  className="h-48 w-full rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #87CEEB 0%, #90EE90 100%)" }}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-500" />
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-green-700" />
                  <div className="text-center relative z-10">
                    {getCharacterImage(selectedCharacter) && (
                      <img 
                        src={getCharacterImage(selectedCharacter)} 
                        alt={getCharacterName(selectedCharacter)}
                        className="w-32 h-32 mx-auto mb-2 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <p className="text-amber-900 font-black text-lg drop-shadow-lg">
                      {getCharacterName(selectedCharacter).toUpperCase()}
                    </p>
                  </div>
                </div>
              ) : (
                <AvatarPreview avatar={avatar} />
              )}
              <Link to="/creator">
                <button className="mt-3 w-full py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-black rounded-lg hover:from-blue-600 hover:to-blue-800 transition shadow-xl text-base border-3 border-blue-800 transform hover:scale-105">
                  ✏️ EDIT CHARACTER
                </button>
              </Link>

              {/* NFT Section */}
              <div className="mt-4">
                <div className="text-base font-black text-amber-900 mb-2 drop-shadow">BLOCKCHAIN NFT</div>
                {checkingNFT ? (
                  <div className="bg-white/90 rounded-xl p-4 shadow-lg border-4 border-purple-300">
                    <div className="text-center text-purple-600 font-bold text-sm">
                      🔍 Checking NFT...
                    </div>
                  </div>
                ) : hasNFT ? (
                  <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4 shadow-lg border-4 border-purple-400">
                    <div className="text-center mb-3">
                      <div className="text-3xl mb-2">🎨</div>
                      <h3 className="font-black text-purple-900 text-lg">NFT OWNED!</h3>
                      <p className="text-purple-700 text-xs mt-1">Your character is on the blockchain</p>
                    </div>
                    
                    <div className="bg-white/70 rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-700 font-bold text-xs">Token ID:</span>
                        <span className="text-purple-900 font-black text-sm">#{nftTokenId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-bold text-xs">Network:</span>
                        <span className="text-purple-900 font-bold text-xs">Mantle Sepolia</span>
                      </div>
                    </div>
                    
                    <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-lg text-xs">
                      🔗 VIEW MY NFT
                    </button>
                    
                    <div className="mt-2 text-center text-xs text-purple-600 font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <span>📈</span> Blockchain Stats
                      </div>
                      <div className="text-[10px] text-purple-500">Immutable & Tradeable</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/90 rounded-xl p-4 shadow-lg border-4 border-gray-300">
                    <div className="text-center mb-3">
                      <div className="text-3xl mb-2 opacity-50">🎨</div>
                      <h3 className="font-black text-gray-700 text-base">No NFT Yet</h3>
                      <p className="text-gray-600 text-xs mt-1">Mint your character on blockchain</p>
                    </div>
                    
                    <button className="w-full py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-black rounded-lg hover:from-gray-500 hover:to-gray-600 transition shadow-lg text-xs">
                      🪙 MINT NFT (Coming Soon)
                    </button>
                  </div>
                )}
              </div>

              {/* Game Stats */}
              <div className="mt-4 bg-white/90 rounded-xl p-3 shadow-lg border-3 border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <h3 className="font-black text-blue-900 text-sm">GAME STATS (Off-chain)</h3>
                </div>
                <div className="flex justify-between text-xs">
                  <div>
                    <span className="text-gray-600 font-bold">Wins:</span>
                    <span className="text-green-700 font-black ml-1">{stats.wins || 39}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-bold">Losses:</span>
                    <span className="text-red-700 font-black ml-1">{stats.losses || 25}</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 text-center mt-1">
                  Game progress is stored in database
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}