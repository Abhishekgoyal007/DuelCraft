import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const [avatar, setAvatar] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [coins, setCoins] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });

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
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300 relative overflow-hidden">
      {/* Animated clouds */}
      <div className="absolute top-10 left-20 w-32 h-20 bg-white rounded-full opacity-80 animate-float"></div>
      <div className="absolute top-32 right-40 w-40 h-24 bg-white rounded-full opacity-70 animate-float-delayed"></div>
      <div className="absolute top-20 right-10 w-24 h-16 bg-white rounded-full opacity-90 animate-float-slow"></div>
      
      {/* Animated stars */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-300 animate-twinkle"></div>
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-yellow-300 animate-twinkle-delayed"></div>
      <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-yellow-300 animate-twinkle-slow"></div>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Stats bar */}
        {user && (
          <div className="mb-8 flex gap-4 justify-center animate-slide-down">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-yellow-600 transform hover:scale-110 transition-transform">
              <span className="text-3xl animate-bounce">🪙</span>
              <div>
                <div className="text-2xl font-black text-white drop-shadow-lg">{coins}</div>
                <div className="text-xs font-bold text-yellow-100">Coins</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-400 to-emerald-600 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-green-700 transform hover:scale-110 transition-transform">
              <span className="text-3xl animate-bounce">🏆</span>
              <div>
                <div className="text-2xl font-black text-white drop-shadow-lg">{stats.wins || 0}</div>
                <div className="text-xs font-bold text-green-100">Wins</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-400 to-pink-600 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-red-700 transform hover:scale-110 transition-transform">
              <span className="text-3xl animate-bounce">💀</span>
              <div>
                <div className="text-2xl font-black text-white drop-shadow-lg">{stats.losses || 0}</div>
                <div className="text-xs font-bold text-red-100">Losses</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 shadow-2xl rounded-3xl p-8 border-8 border-amber-700 animate-fade-in">
          <div className="flex gap-8 flex-col lg:flex-row">
            <div className="flex-1">
              <h2 className="text-5xl font-black text-amber-900 drop-shadow-lg mb-2" style={{ textShadow: "3px 3px 0px rgba(255,255,255,0.5)" }}>
                GAME HUB ⚔️
              </h2>
              <p className="text-amber-800 font-semibold text-lg">Choose your destiny and battle!</p>

              {/* Main actions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/arena" className="group">
                  <div className="bg-gradient-to-br from-red-500 to-red-700 p-8 rounded-2xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-4 border-red-800 transform hover:-translate-y-2">
                    <div className="text-5xl mb-3 animate-pulse">⚔️</div>
                    <div className="text-2xl font-black drop-shadow-md">PLAY NOW</div>
                    <div className="text-red-200 font-semibold">Jump into epic 1v1 battles!</div>
                  </div>
                </Link>
                
                <Link to="/creator" className="group">
                  <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-8 rounded-2xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-4 border-yellow-700 transform hover:-translate-y-2">
                    <div className="text-5xl mb-3">✨</div>
                    <div className="text-2xl font-black drop-shadow-md">CREATE FIGHTER</div>
                    <div className="text-yellow-200 font-semibold">Customize your champion!</div>
                  </div>
                </Link>
                
                <Link to="/shop" className="group">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-8 rounded-2xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-4 border-purple-800 transform hover:-translate-y-2">
                    <div className="text-5xl mb-3">🛒</div>
                    <div className="text-2xl font-black drop-shadow-md">SHOP</div>
                    <div className="text-purple-200 font-semibold">Buy items & power-ups!</div>
                  </div>
                </Link>
                
                <Link to="/leaderboard" className="group">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-700 p-8 rounded-2xl text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-4 border-green-800 transform hover:-translate-y-2">
                    <div className="text-5xl mb-3 animate-bounce">🏆</div>
                    <div className="text-2xl font-black drop-shadow-md">LEADERBOARD</div>
                    <div className="text-emerald-200 font-semibold">Top warriors worldwide!</div>
                  </div>
                </Link>
              </div>

              {/* Feature badges */}
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <div className="bg-white px-5 py-3 rounded-full shadow-lg border-3 border-slate-300 font-bold text-slate-700 text-sm flex items-center gap-2 hover:scale-105 transition-transform">
                  <span>📊</span> Leaderboards
                </div>
                <div className="bg-white px-5 py-3 rounded-full shadow-lg border-3 border-slate-300 font-bold text-slate-700 text-sm flex items-center gap-2 hover:scale-105 transition-transform">
                  <span>🪙</span> Token Rewards
                </div>
                <div className="bg-white px-5 py-3 rounded-full shadow-lg border-3 border-slate-300 font-bold text-slate-700 text-sm flex items-center gap-2 hover:scale-105 transition-transform">
                  <span>🎨</span> Custom Avatars
                </div>
                <div className="bg-white px-5 py-3 rounded-full shadow-lg border-3 border-slate-300 font-bold text-slate-700 text-sm flex items-center gap-2 hover:scale-105 transition-transform">
                  <span>⚡</span> Real-time PvP
                </div>
              </div>

              <div className="mt-6">
                <Link to="/modes">
                  <button className="w-full py-4 bg-white border-4 border-amber-700 rounded-2xl text-amber-900 font-black text-lg hover:bg-amber-50 transition shadow-xl hover:shadow-2xl transform hover:scale-105">
                    🎮 VIEW ALL GAME MODES
                  </button>
                </Link>
              </div>
            </div>

            {/* Avatar preview */}
            <div className="mt-10 w-full lg:w-80">
              <div className="text-lg font-black text-amber-900 mb-4 drop-shadow">YOUR FIGHTER</div>
              {selectedCharacter ? (
                <div 
                  className="h-64 w-full rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #87CEEB 0%, #90EE90 100%)" }}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-500" />
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-green-700" />
                  <div className="text-center relative z-10">
                    {getCharacterImage(selectedCharacter) && (
                      <img 
                        src={getCharacterImage(selectedCharacter)} 
                        alt={getCharacterName(selectedCharacter)}
                        className="w-48 h-48 mx-auto mb-2 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <p className="text-amber-900 font-black text-2xl drop-shadow-lg">
                      {getCharacterName(selectedCharacter).toUpperCase()}
                    </p>
                    <p className="text-amber-700 font-bold text-sm mt-1">
                      {getCharacter(selectedCharacter)?.description || 'Ready for battle!'}
                    </p>
                  </div>
                </div>
              ) : (
                <AvatarPreview avatar={avatar} />
              )}
              <Link to="/creator">
                <button className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-black rounded-xl hover:from-blue-600 hover:to-blue-800 transition shadow-xl text-lg border-4 border-blue-800 transform hover:scale-105">
                  ✏️ EDIT CHARACTER
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}