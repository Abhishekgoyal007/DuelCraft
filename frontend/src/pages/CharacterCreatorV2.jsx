import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CHARACTER_LAYERS, DEFAULT_AVATAR, LAYER_ORDER } from "../config/characterConfig";

// Simple character preview using colored divs
function CharacterPreview({ avatar }) {
  const bodyColors = ["#FFDBAC", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3317"];
  const bodyColor = bodyColors[avatar.body] || bodyColors[0];
  
  return (
    <div className="relative w-32 h-48 mx-auto">
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Head */}
        <div 
          className="w-16 h-16 rounded-full relative shadow-lg"
          style={{ backgroundColor: bodyColor }}
        >
          {/* Eyes */}
          <div className="absolute top-5 left-3 w-2 h-2 bg-black rounded-full"></div>
          <div className="absolute top-5 right-3 w-2 h-2 bg-black rounded-full"></div>
          {/* Mouth */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-4 h-1 bg-red-400 rounded"></div>
          {/* Hair */}
          {avatar.hair > 0 && (
            <div 
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-6 rounded-t-full"
              style={{ backgroundColor: avatar.hairColor || "#4a3728" }}
            ></div>
          )}
        </div>
        {/* Body/Torso */}
        <div 
          className="w-12 h-16 rounded-t-lg mt-1 shadow-md"
          style={{ backgroundColor: avatar.topColor || "#3498db" }}
        ></div>
        {/* Legs */}
        <div className="flex gap-1">
          <div 
            className="w-5 h-12 rounded-b shadow-md"
            style={{ backgroundColor: avatar.bottomColor || "#2c3e50" }}
          ></div>
          <div 
            className="w-5 h-12 rounded-b shadow-md"
            style={{ backgroundColor: avatar.bottomColor || "#2c3e50" }}
          ></div>
        </div>
      </div>
    </div>
  );
}

// Layer option button
function LayerOption({ option, isSelected, onClick, layer }) {
  const bodyColors = ["#FFDBAC", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3317"];
  
  return (
    <button
      onClick={onClick}
      className={`
        relative p-3 rounded-xl border-4 transition-all transform hover:scale-110
        ${isSelected 
          ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-xl scale-105" 
          : "border-slate-300 bg-white hover:border-slate-400 shadow-lg"
        }
      `}
    >
      <div className="w-16 h-16 flex items-center justify-center">
        {layer === "body" ? (
          <div 
            className="w-12 h-12 rounded-lg shadow-md"
            style={{ backgroundColor: bodyColors[option.id] }}
          ></div>
        ) : (
          <div className="text-3xl">
            {layer === "eyes" && ["👁️", "😊", "😠", "😴", "😉"][option.id]}
            {layer === "hair" && ["🚫", "💇", "💇‍♀️", "💇‍♂️", "⚡", "🦱"][option.id]}
            {layer === "tops" && ["🚫", "👕", "🎽", "🧥", "🛡️"][option.id]}
            {layer === "bottoms" && ["🩳", "👖", "👖", "🛡️"][option.id]}
            {layer === "shoes" && ["🚫", "👟", "👢", "🩴"][option.id]}
            {layer === "brows" && ["〰️", "━", "─", "╱"][option.id]}
            {layer === "mouth" && ["😊", "😮", "😐", "😁"][option.id]}
          </div>
        )}
      </div>
      <div className="text-xs text-center mt-1 font-bold text-slate-700">
        ID: {option.id}
      </div>
    </button>
  );
}

export default function CharacterCreatorV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [activeTab, setActiveTab] = useState("body");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing avatar on mount
  useEffect(() => {
    async function loadProfile() {
      if (!user?.address) return;
      try {
        const res = await fetch(`http://localhost:4000/profile?address=${user.address}`);
        const data = await res.json();
        if (data?.avatar && typeof data.avatar === "object") {
          setAvatar({ ...DEFAULT_AVATAR, ...data.avatar });
        }
      } catch (err) {
        console.warn("Failed to load profile:", err);
      }
    }
    loadProfile();
  }, [user]);

  const updateLayer = (layer, value) => {
    setAvatar(prev => ({ ...prev, [layer]: value }));
  };

  const saveAvatar = async () => {
    if (!user?.address) {
      alert("Please connect your wallet first!");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: user.address, avatar }),
      });
      
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert("Failed to save avatar");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save avatar");
    } finally {
      setLoading(false);
    }
  };

  const clearAvatar = () => {
    setAvatar(DEFAULT_AVATAR);
  };

  const tabs = Object.keys(CHARACTER_LAYERS);

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

      {/* Header */}
      <div className="relative z-20 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 shadow-2xl border-b-8 border-purple-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/hub")}
            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform font-bold text-2xl border-4 border-purple-700"
          >
            🏠
          </button>
          <div className="text-white font-black text-3xl drop-shadow-lg animate-bounce" style={{ textShadow: "3px 3px 0px rgba(0,0,0,0.3)" }}>
            ✨ CHARACTER CREATOR ✨
          </div>
          {user ? (
            <div className="bg-white px-4 py-2 rounded-xl font-bold text-purple-700 border-4 border-purple-700 shadow-lg">
              {user.short}
            </div>
          ) : (
            <button className="bg-blue-500 text-white px-6 py-2 rounded-xl font-bold border-4 border-blue-700 hover:scale-105 transition-transform shadow-lg">
              Login
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Preview Panel */}
          <div className="bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-3xl shadow-2xl p-8 border-8 border-amber-700 animate-fade-in">
            <h2 className="text-3xl font-black text-center mb-6 text-amber-900 drop-shadow" style={{ textShadow: "2px 2px 0px rgba(255,255,255,0.5)" }}>
              🎨 PREVIEW
            </h2>
            
            <div className="bg-gradient-to-br from-sky-100 to-blue-100 rounded-2xl p-8 mb-6 border-4 border-blue-300 shadow-inner">
              <CharacterPreview avatar={avatar} />
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={clearAvatar}
                className="px-6 py-3 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl font-black hover:from-red-600 hover:to-red-800 transition shadow-xl border-4 border-red-800 hover:scale-105 transform text-lg"
              >
                🗑️ CLEAR
              </button>
              <button
                onClick={saveAvatar}
                disabled={loading || !user}
                className={`px-6 py-3 rounded-xl font-black transition shadow-xl border-4 hover:scale-105 transform text-lg ${
                  saved 
                    ? "bg-gradient-to-br from-green-500 to-green-700 text-white border-green-800"
                    : "bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 border-blue-800"
                } ${loading ? "opacity-50" : ""}`}
              >
                {saved ? "✓ SAVED!" : loading ? "⏳ SAVING..." : "💾 CONFIRM"}
              </button>
            </div>
          </div>

          {/* Creator Panel */}
          <div className="lg:col-span-2 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-3xl shadow-2xl p-8 border-8 border-amber-700 animate-fade-in">
            <h2 className="text-3xl font-black mb-6 text-amber-900 drop-shadow" style={{ textShadow: "2px 2px 0px rgba(255,255,255,0.5)" }}>
              🎮 CREATE YOUR FIGHTER
            </h2>
            
            {/* Tabs */}
            <div className="flex flex-wrap gap-3 mb-6">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 rounded-xl font-black text-sm transition transform hover:scale-105 border-4 shadow-lg ${
                    activeTab === tab
                      ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-800 scale-105"
                      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
                  }`}
                >
                  {CHARACTER_LAYERS[tab].name}
                </button>
              ))}
            </div>

            {/* Options Grid */}
            <div className="bg-white border-8 border-amber-600 rounded-2xl p-6 shadow-inner">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {CHARACTER_LAYERS[activeTab].options.map(option => (
                  <LayerOption
                    key={option.id}
                    option={option}
                    layer={activeTab}
                    isSelected={avatar[activeTab] === option.id}
                    onClick={() => updateLayer(activeTab, option.id)}
                  />
                ))}
              </div>
              
              {/* Color pickers */}
              {activeTab === "hair" && avatar.hair > 0 && (
                <div className="mt-6 flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-xl border-4 border-purple-300">
                  <span className="text-sm font-black text-purple-900">💈 Hair Color:</span>
                  <input
                    type="color"
                    value={avatar.hairColor || "#4a3728"}
                    onChange={(e) => updateLayer("hairColor", e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-4 border-purple-500 shadow-lg"
                  />
                </div>
              )}
              {activeTab === "tops" && avatar.tops > 0 && (
                <div className="mt-6 flex items-center gap-3 bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-xl border-4 border-blue-300">
                  <span className="text-sm font-black text-blue-900">👕 Top Color:</span>
                  <input
                    type="color"
                    value={avatar.topColor || "#3498db"}
                    onChange={(e) => updateLayer("topColor", e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-4 border-blue-500 shadow-lg"
                  />
                </div>
              )}
              {activeTab === "bottoms" && (
                <div className="mt-6 flex items-center gap-3 bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-xl border-4 border-green-300">
                  <span className="text-sm font-black text-green-900">👖 Bottom Color:</span>
                  <input
                    type="color"
                    value={avatar.bottomColor || "#2c3e50"}
                    onChange={(e) => updateLayer("bottomColor", e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-4 border-green-500 shadow-lg"
                  />
                </div>
              )}
            </div>

            {/* Current Selection Summary */}
            <div className="mt-6 p-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl border-4 border-slate-400 shadow-lg">
              <h3 className="font-black text-lg mb-3 text-slate-800">📊 CURRENT STATS:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {LAYER_ORDER.map(layer => (
                  <div key={layer} className="bg-white p-2 rounded-lg border-2 border-slate-300 shadow">
                    <span className="text-slate-500 font-bold block">{CHARACTER_LAYERS[layer]?.name}:</span>
                    <span className="font-black text-slate-800">{avatar[layer]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
        @keyframes twinkle-delayed {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes twinkle-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 7s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        .animate-twinkle-delayed {
          animation: twinkle-delayed 2.5s ease-in-out infinite;
        }
        .animate-twinkle-slow {
          animation: twinkle-slow 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}