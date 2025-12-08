import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

import { CHARACTER_LAYERS, LAYER_ORDER, DEFAULT_AVATAR } from "../config/characterConfig";
import { getCharacterImage, getCharacterName } from "../config/characters";
import { getContractAddresses } from "../config/contracts";
import DuelCraftCharacterABI from "../contracts/abis/DuelCraftCharacter.json";

// Floating cloud component with interactive hover
function Cloud({ initialX, y, speed, size, delay }) {
  const [x, setX] = useState(initialX);
  const [isHovered, setIsHovered] = useState(false);
  
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
      className="absolute cursor-pointer transition-transform duration-300"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        transform: `scale(${isHovered ? size * 1.2 : size})`,
        transition: 'transform 0.3s ease, left 0.05s linear',
        zIndex: 5,
        animation: `float 3s ease-in-out infinite ${delay}s`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src="/assets/landingpage/cloud.png" 
        alt="cloud" 
        className="w-32 h-auto drop-shadow-lg"
        style={{
          filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none'
        }}
      />
    </div>
  );
}

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

  // Check for NFT ownership
  useEffect(() => {
    const checkNFT = async () => {
      if (!user?.address) return;
      
      setCheckingNFT(true);
      try {
        // Connect to Mantle Testnet
        const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.mantle.xyz');
        const contractAddresses = getContractAddresses(5003);
        const characterContract = new ethers.Contract(
          contractAddresses.DuelCraftCharacter,
          DuelCraftCharacterABI,
          provider
        );
        
        // Use walletToCharacter mapping to get token ID directly
        const tokenId = await characterContract.walletToCharacter(user.address);
        
        // tokenId will be 0 if user hasn't minted
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
      className="h-screen w-screen fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/landingpage/landingpagebg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/10" />
      
      {/* Animated clouds */}
      <Cloud initialX={10} y={8} speed={0.08} size={1} delay={0} />
      <Cloud initialX={35} y={15} speed={0.05} size={1.3} delay={0.5} />
      <Cloud initialX={60} y={5} speed={0.06} size={0.9} delay={1} />
      <Cloud initialX={85} y={20} speed={0.07} size={1.1} delay={1.5} />
      <Cloud initialX={50} y={25} speed={0.04} size={0.8} delay={2} />

      <main className="max-w-7xl mx-auto px-4 py-4 relative z-10 flex flex-col items-center justify-center h-full overflow-y-auto">
        {/* Stats bar */}
        {user && (
          <div className="mb-4 flex gap-3 justify-center animate-slide-down flex-wrap">
            {/* Arena Coins */}
            <div className="relative bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-yellow-700 transform hover:scale-110 transition-all hover:rotate-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-orange-800/20 to-transparent"></div>
              <span className="text-3xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] relative z-10 animate-pulse">💰</span>
              <div className="relative z-10">
                <div className="text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 0 15px rgba(255,215,0,0.6)' }}>{coins}</div>
                <div className="text-[9px] font-black text-yellow-100 tracking-wider">GOLD STASH</div>
              </div>
            </div>

            {/* ARENA Tokens */}
            <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-700 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-purple-900 transform hover:scale-110 transition-all hover:-rotate-1 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent)]"></div>
              <span className="text-3xl drop-shadow-[0_0_15px_rgba(168,85,247,0.9)] relative z-10" style={{ animation: 'pulse 2s ease-in-out infinite' }}>💎</span>
              <div className="relative z-10">
                <div className="text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 0 15px rgba(168,85,247,0.8)' }}>{arenaBalance || '100001000.00'}</div>
                <div className="text-[9px] font-black text-purple-100 tracking-wider">CRYSTAL GEMS</div>
              </div>
            </div>

            {/* Wins */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-green-800 transform hover:scale-110 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/10 via-transparent to-transparent"></div>
              <span className="text-3xl drop-shadow-[0_0_12px_rgba(252,211,77,0.8)] relative z-10 animate-bounce">👑</span>
              <div className="relative z-10">
                <div className="text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 0 12px rgba(16,185,129,0.8)' }}>{stats.wins || 0}</div>
                <div className="text-[9px] font-black text-green-100 tracking-wider">VICTORIES</div>
              </div>
            </div>

            {/* Losses */}
            <div className="relative bg-gradient-to-br from-red-600 via-rose-600 to-red-800 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-red-900 transform hover:scale-110 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              <span className="text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] relative z-10">⚔️</span>
              <div className="relative z-10">
                <div className="text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 0 12px rgba(239,68,68,0.8)' }}>{stats.losses || 0}</div>
                <div className="text-[9px] font-black text-red-100 tracking-wider">BATTLES LOST</div>
              </div>
            </div>
          </div>
        )}

        {/* Big Board Container */}
        <div 
          className="relative shadow-2xl w-full max-w-7xl rounded-3xl border-8 border-amber-700 flex-1 overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom right, #FFF4E6, #FFE4B5, #FFEAA7)',
            padding: '32px 48px',
            animation: 'fadeIn 0.6s ease-out',
            height: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div className="flex gap-6 flex-col lg:flex-row h-full">
            <div className="flex-1 flex flex-col min-w-0">
              <h2 className="text-3xl font-black text-amber-900 drop-shadow-lg mb-1" style={{ textShadow: "3px 3px 0px rgba(255,255,255,0.5)" }}>
                GAME HUB ⚔️
              </h2>
              <p className="text-amber-800 font-semibold text-sm mb-3">Choose your destiny and battle!</p>

              {/* Main actions */}
              <div className="grid grid-cols-3 gap-3 flex-1">
                <Link to="/arena" className="group h-full">
                  <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-4 rounded-xl text-white shadow-2xl hover:shadow-red-500/50 transition-all hover:scale-110 border-4 border-red-900 transform hover:-translate-y-2 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]">⚔️</div>
                      <div className="text-2xl font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-wider" style={{ textShadow: '0 0 20px rgba(255,255,0,0.5), 2px 2px 0px rgba(0,0,0,0.5)' }}>BATTLE!</div>
                      <div className="text-red-100 font-bold text-xs mt-2 tracking-wide">⚡ INSTANT COMBAT ⚡</div>
                    </div>
                  </div>
                </Link>
                
                <Link to="/creator" className="group h-full">
                  <div className="relative bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-4 rounded-xl text-white shadow-2xl hover:shadow-yellow-400/50 transition-all hover:scale-110 border-4 border-yellow-600 transform hover:-translate-y-2 hover:rotate-1 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),transparent)]"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2 animate-bounce drop-shadow-lg">🎨</div>
                      <div className="text-xl font-black drop-shadow-lg tracking-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>FORGE HERO</div>
                      <div className="text-amber-100 font-bold text-xs mt-2">✦ CRAFT YOUR LEGEND ✦</div>
                    </div>
                  </div>
                </Link>
                
                <Link to="/shop" className="group h-full">
                  <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-purple-800 p-4 rounded-xl text-white shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-110 border-4 border-purple-900 transform hover:-translate-y-2 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-300/20 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2">💰</div>
                      <div className="text-xl font-black drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>ARMORY</div>
                      <div className="text-purple-100 font-bold text-xs mt-2">⚜️ GEAR & GLORY ⚜️</div>
                    </div>
                  </div>
                </Link>
                
                <Link to="/marketplace" className="group h-full">
                  <div className="relative bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-cyan-400/50 transition-all hover:scale-110 border-4 border-blue-900 transform hover:-translate-y-2 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2 drop-shadow-xl">🎭</div>
                      <div className="text-xl font-black drop-shadow-lg" style={{ textShadow: '0 0 10px rgba(0,255,255,0.5), 2px 2px 4px rgba(0,0,0,0.6)' }}>BAZAAR</div>
                      <div className="text-cyan-100 font-bold text-xs mt-2">💎 NFT EXCHANGE 💎</div>
                    </div>
                  </div>
                </Link>
                
                <Link to="/tournament" className="group h-full">
                  <div className="relative bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-pink-500/50 transition-all hover:scale-110 border-4 border-purple-900 transform hover:-translate-y-2 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/10 via-transparent to-transparent"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2 animate-pulse drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">👑</div>
                      <div className="text-xl font-black drop-shadow-lg tracking-wide" style={{ textShadow: '0 0 15px rgba(255,215,0,0.6), 2px 2px 4px rgba(0,0,0,0.6)' }}>ARENA WAR</div>
                      <div className="text-pink-100 font-bold text-xs mt-2">⚡ GLORY AWAITS ⚡</div>
                    </div>
                  </div>
                </Link>
                
                <Link to="/season-pass" className="group h-full">
                  <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-800 p-4 rounded-xl text-white shadow-2xl hover:shadow-indigo-500/50 transition-all hover:scale-110 border-4 border-indigo-900 transform hover:-translate-y-2 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-purple-600/10"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">🌟</div>
                      <div className="text-xl font-black drop-shadow-lg" style={{ textShadow: '0 0 12px rgba(168,85,247,0.8), 2px 2px 4px rgba(0,0,0,0.6)' }}>VIP PASS</div>
                      <div className="text-indigo-100 font-bold text-xs mt-2">✨ ELITE REWARDS ✨</div>
                    </div>
                  </div>
                </Link>
                
                <Link to="/leaderboard" className="group h-full">
                  <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-4 rounded-xl text-white shadow-2xl hover:shadow-emerald-500/50 transition-all hover:scale-110 border-4 border-green-900 transform hover:-translate-y-2 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2 animate-bounce drop-shadow-xl">🏅</div>
                      <div className="text-xl font-black drop-shadow-lg" style={{ textShadow: '0 0 10px rgba(16,185,129,0.8), 2px 2px 4px rgba(0,0,0,0.6)' }}>HALL OF FAME</div>
                      <div className="text-emerald-100 font-bold text-xs mt-2">⭐ TOP LEGENDS ⭐</div>
                    </div>
                  </div>
                </Link>

                {/* Game Stats */}
              <div className="col-span-1 relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 shadow-lg border-4 border-blue-400 flex flex-col justify-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400"></div>
                <div className="flex items-center gap-2 mb-3 justify-center">
                  <span className="text-2xl drop-shadow-lg">📈</span>
                  <h3 className="font-black text-blue-900 text-base tracking-tight">BATTLE RECORD</h3>
                </div>
                <div className="flex justify-around text-sm">
                  <div className="text-center bg-green-100 rounded-lg p-2 border-2 border-green-400 shadow-md">
                    <div className="text-green-800 font-bold text-[10px]">VICTORIES</div>
                    <div className="text-green-700 font-black text-2xl drop-shadow">{stats.wins || 39}</div>
                  </div>
                  <div className="text-center bg-red-100 rounded-lg p-2 border-2 border-red-400 shadow-md">
                    <div className="text-red-800 font-bold text-[10px]">DEFEATS</div>
                    <div className="text-red-700 font-black text-2xl drop-shadow">{stats.losses || 25}</div>
                  </div>
                </div>
                <div className="text-[9px] text-blue-600 text-center mt-2 font-semibold">
                  ⚡ Live Stats ⚡
                </div>
              </div>
                <Link to="/modes" className="h-full">
                  <button className="relative w-full h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 border-4 border-amber-700 rounded-xl text-white font-black text-base hover:from-orange-500 hover:via-amber-500 hover:to-orange-500 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center justify-center gap-2 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    <div className="relative z-10 flex items-center gap-2">
                      <span className="text-3xl animate-pulse drop-shadow-lg">🎮</span>
                      <span className="drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.4)' }}>MORE MODES!</span>
                    </div>
                  </button>
                </Link>
              </div>
            </div>

            {/* Avatar preview */}
            <div className="w-full lg:w-80 flex flex-col">
              <div className="text-lg font-black text-amber-900 mb-2 drop-shadow-lg">YOUR FIGHTER</div>
              {selectedCharacter ? (
                <div 
                  className="h-56 w-full rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden border-4 border-green-500"
                  style={{ background: "linear-gradient(135deg, #87CEEB 0%, #90EE90 100%)" }}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-500" />
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-green-700" />
                  <div className="text-center relative z-10">
                    {getCharacterImage(selectedCharacter) && (
                      <img 
                        src={getCharacterImage(selectedCharacter)} 
                        alt={getCharacterName(selectedCharacter)}
                        className="w-40 h-40 mx-auto mb-2 object-contain"
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
              </Link>

              {/* NFT Section */}
              <div className="mt-3">
                <div className="relative text-base font-black text-purple-900 mb-2 drop-shadow-lg text-center py-2 bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 rounded-lg border-3 border-purple-600 shadow-lg">
                  <span style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.5), 0 0 10px rgba(147,51,234,0.5)' }}>✨ NFT VAULT ✨</span>
                </div>
                {checkingNFT ? (
                  <div className="relative bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4 shadow-lg border-4 border-purple-400 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    <div className="text-center text-purple-700 font-black text-sm relative z-10">
                      <span className="animate-spin inline-block">🔮</span> Scanning Blockchain...
                    </div>
                  </div>
                ) : hasNFT ? (
                  <div className="relative bg-gradient-to-br from-purple-200 via-pink-200 to-fuchsia-200 rounded-xl p-3 shadow-lg border-4 border-purple-500 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4),transparent)]"></div>
                    <div className="text-center mb-2 relative z-10">
                      <div className="text-3xl mb-1 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-pulse">💎</div>
                      <h3 className="font-black text-purple-900 text-lg drop-shadow-md" style={{ textShadow: '0 0 10px rgba(168,85,247,0.5)' }}>NFT SECURED!</h3>
                      <p className="text-purple-800 text-xs mt-1 font-bold">⛓️ On-Chain Asset</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-white/80 to-purple-100/80 backdrop-blur rounded-lg p-2 mb-2 border-2 border-purple-300 relative z-10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-purple-800 font-black text-[10px]">TOKEN ID:</span>
                        <span className="text-purple-900 font-black text-sm drop-shadow">#{nftTokenId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-purple-800 font-black text-[10px]">CHAIN:</span>
                        <span className="text-purple-900 font-black text-[10px]">Mantle Sepolia</span>
                      </div>
                    </div>
                    
                    <button className="relative w-full py-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-black rounded-lg hover:from-fuchsia-600 hover:to-purple-600 transition-all shadow-lg text-xs border-2 border-purple-800 transform hover:scale-105 overflow-hidden z-10">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <span className="relative z-10 drop-shadow-lg">🌐 EXPLORE NFT</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative bg-gradient-to-br from-slate-100 to-gray-200 rounded-xl p-3 shadow-lg border-4 border-gray-400 overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
                    <div className="text-center mb-2 relative z-10">
                      <div className="text-4xl mb-2 opacity-40 filter grayscale">🎭</div>
                      <h3 className="font-black text-gray-700 text-base">VAULT EMPTY</h3>
                      <p className="text-gray-600 text-xs mt-1 font-semibold">Forge your legacy on-chain</p>
                    </div>
                    
                    <button className="relative w-full py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black rounded-lg hover:from-pink-500 hover:to-indigo-500 transition-all shadow-lg text-xs border-2 border-gray-700 transform hover:scale-105 overflow-hidden z-10">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <span className="relative z-10 drop-shadow-lg">⚡ FORGE NFT</span>
                    </button>
                  </div>
                )}
              </div>

              
            </div>
          </div>
        </div>
      </main>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-down {
          animation: slide-down 0.5s ease-out;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}