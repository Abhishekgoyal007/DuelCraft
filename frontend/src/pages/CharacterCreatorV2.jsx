// src/pages/CharacterCreatorV2.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CHARACTER_LAYERS, DEFAULT_AVATAR, LAYER_ORDER } from "../config/characterConfig";
import Navbar from "../components/Navbar";

// Simple character preview using colored divs (replace with actual sprites later)
function CharacterPreview({ avatar }) {
  const bodyColors = ["#FFDBAC", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3317"];
  const bodyColor = bodyColors[avatar.body] || bodyColors[0];
  
  return (
    <div className="relative w-32 h-48 mx-auto">
      {/* Simple character representation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Head */}
        <div 
          className="w-16 h-16 rounded-full relative"
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
          className="w-12 h-16 rounded-t-lg mt-1"
          style={{ backgroundColor: avatar.topColor || "#3498db" }}
        ></div>
        {/* Legs */}
        <div className="flex gap-1">
          <div 
            className="w-5 h-12 rounded-b"
            style={{ backgroundColor: avatar.bottomColor || "#2c3e50" }}
          ></div>
          <div 
            className="w-5 h-12 rounded-b"
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
        relative p-2 rounded-lg border-2 transition-all
        ${isSelected 
          ? "border-blue-500 bg-blue-50 shadow-md" 
          : "border-gray-200 bg-white hover:border-gray-300"
        }
      `}
    >
      <div className="w-16 h-16 flex items-center justify-center">
        {layer === "body" ? (
          <div 
            className="w-12 h-12 rounded-lg"
            style={{ backgroundColor: bodyColors[option.id] }}
          ></div>
        ) : (
          <div className="text-2xl">
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
      <div className="text-xs text-center mt-1 font-medium text-gray-600">
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
          // Merge with defaults to handle old avatar format
          setAvatar({ ...DEFAULT_AVATAR, ...data.avatar });
        }
      } catch (err) {
        console.warn("Failed to load profile:", err);
      }
    }
    loadProfile();
  }, [user]);

  // Update a specific layer
  const updateLayer = (layer, value) => {
    setAvatar(prev => ({ ...prev, [layer]: value }));
  };

  // Save avatar to server
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

  // Clear to defaults
  const clearAvatar = () => {
    setAvatar(DEFAULT_AVATAR);
  };

  const tabs = Object.keys(CHARACTER_LAYERS);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-200 to-green-400">
      {/* Header with forest background */}
      <div 
        className="h-16 bg-cover bg-center flex items-center justify-between px-4"
        style={{ 
          backgroundImage: "linear-gradient(to right, #228B22, #32CD32, #228B22)",
        }}
      >
        <button 
          onClick={() => navigate("/hub")}
          className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow hover:bg-gray-100"
        >
          🏠
        </button>
        <div className="text-white font-bold text-xl">Character Creator</div>
        {user ? (
          <div className="text-white text-sm">{user.short}</div>
        ) : (
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Login</button>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Preview Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-center mb-6">Preview Character</h2>
            
            <div className="bg-gray-100 rounded-lg p-8 mb-6">
              <CharacterPreview avatar={avatar} />
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={clearAvatar}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
              >
                CLEAR
              </button>
              <button
                onClick={saveAvatar}
                disabled={loading || !user}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  saved 
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                } ${loading ? "opacity-50" : ""}`}
              >
                {saved ? "SAVED! ✓" : loading ? "SAVING..." : "CONFIRM"}
              </button>
            </div>
          </div>

          {/* Creator Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Create Character</h2>
            
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    activeTab === tab
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {CHARACTER_LAYERS[tab].name}
                </button>
              ))}
            </div>

            {/* Options Grid */}
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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
              
              {/* Color picker for certain layers */}
              {activeTab === "hair" && avatar.hair > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium">Hair Color:</span>
                  <input
                    type="color"
                    value={avatar.hairColor || "#4a3728"}
                    onChange={(e) => updateLayer("hairColor", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                </div>
              )}
              {activeTab === "tops" && avatar.tops > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium">Top Color:</span>
                  <input
                    type="color"
                    value={avatar.topColor || "#3498db"}
                    onChange={(e) => updateLayer("topColor", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                </div>
              )}
              {activeTab === "bottoms" && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium">Bottom Color:</span>
                  <input
                    type="color"
                    value={avatar.bottomColor || "#2c3e50"}
                    onChange={(e) => updateLayer("bottomColor", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Current Selection Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Current Selection:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {LAYER_ORDER.map(layer => (
                  <div key={layer} className="flex justify-between">
                    <span className="text-gray-500">{CHARACTER_LAYERS[layer]?.name}:</span>
                    <span className="font-medium">{avatar[layer]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
