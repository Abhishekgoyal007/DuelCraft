// src/pages/CharacterCreator.jsx
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { CHARACTER_LIST } from "../config/characters";

// Use characters from config
const PREMADE_CHARACTERS = CHARACTER_LIST;

export default function CharacterCreator() {
  const auth = useAuth();
  const user = auth?.user ?? null;

  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load player's selected character on mount
  useEffect(() => {
    async function loadCharacter() {
      if (!user?.address) return;
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/profile?address=${user.address}`);
        const data = await res.json();
        if (data?.selectedCharacter) {
          setSelectedCharacter(data.selectedCharacter);
        }
      } catch (err) {
        console.error("Failed to load character:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCharacter();
  }, [user]);

  // Select a character
  function selectCharacter(charId) {
    setSelectedCharacter(charId);
    setSaved(false);
  }

  // Save selected character to backend
  async function saveCharacter() {
    if (!user?.address) {
      alert("Please connect wallet first");
      return;
    }
    if (!selectedCharacter) {
      alert("Please select a character first");
      return;
    }
    setSaving(true);
    try {
      console.log('[CharacterCreator] Saving character:', selectedCharacter);
      const res = await fetch(`http://localhost:4000/api/player/${user.address}/select-character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: selectedCharacter })
      });
      const data = await res.json();
      console.log('[CharacterCreator] Save response:', data);
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[CharacterCreator] Save error:', err);
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedCharData = PREMADE_CHARACTERS.find(c => c.id === selectedCharacter);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-300 via-sky-400 to-emerald-500">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-xl animate-pulse">Loading assets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-300 via-sky-400 to-emerald-500">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2" 
              style={{ fontFamily: "'Press Start 2P', system-ui" }}>
            ⚔️ Character Selection ⚔️
          </h1>
          <p className="text-white/80 text-sm">Choose your fighter</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Selected Character Preview */}
          {selectedCharData && (
            <div className="bg-amber-100 border-4 border-amber-800 rounded-xl p-6 shadow-lg mb-6">
              <h3 className="text-center font-bold text-amber-900 mb-4 text-xl">Selected Character</h3>
              <div className="flex items-center justify-center gap-6">
                {selectedCharData.image ? (
                  <img 
                    src={selectedCharData.image} 
                    alt={selectedCharData.name}
                    className="w-32 h-32 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="text-8xl">{selectedCharData.icon}</div>
                )}
                <div>
                  <h4 className="text-2xl font-bold text-amber-900 mb-2">{selectedCharData.name}</h4>
                  <p className="text-amber-700 mb-4">{selectedCharData.description}</p>
                  <div className="flex gap-2">
                    <div 
                      className="w-16 h-16 rounded-lg border-3 border-amber-800" 
                      style={{ backgroundColor: selectedCharData.color }}
                    />
                    <div className="text-sm text-amber-700">
                      <div>Color: {selectedCharData.color}</div>
                      <div>Stats Ready</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Character Grid */}
          <div className="bg-amber-100 border-4 border-amber-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-center font-bold text-amber-900 mb-4 text-lg">Select Your Character</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {PREMADE_CHARACTERS.map(char => {
                const isSelected = selectedCharacter === char.id;
                return (
                  <button
                    key={char.id}
                    onClick={() => selectCharacter(char.id)}
                    className={`relative p-4 rounded-xl border-4 transition-all transform hover:scale-105 ${
                      isSelected
                        ? 'border-green-500 bg-green-100 ring-4 ring-green-400 scale-105'
                        : 'border-amber-300 bg-amber-50 hover:border-amber-500'
                    }`}
                  >
                    {char.image ? (
                      <img 
                        src={char.image} 
                        alt={char.name}
                        className="w-24 h-24 mx-auto mb-2 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="text-6xl mb-2 text-center">{char.icon}</div>
                    )}
                    <div className="text-center font-bold text-amber-900 mb-1">{char.name}</div>
                    <div className="text-xs text-amber-700 text-center mb-2">{char.description}</div>
                    <div 
                      className="w-full h-8 rounded-lg border-2 border-amber-800" 
                      style={{ backgroundColor: char.color }}
                    />
                    
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg shadow-lg">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="flex flex-col gap-3">
              <button
                onClick={saveCharacter}
                disabled={saving || !user?.address || !selectedCharacter}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
                  saving || !selectedCharacter ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-lg'
                }`}
              >
                {saving ? '💾 Saving...' : '💾 Save Character'}
              </button>
              
              {saved && (
                <div className="text-center text-green-700 font-semibold animate-bounce-in">
                  ✅ Character saved!
                </div>
              )}
              
              {!user?.address && (
                <div className="text-center text-red-600 text-xs">
                  Connect wallet to save
                </div>
              )}

              <Link to="/hub" className="block">
                <button className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors">
                  ← Back to Hub
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* 
===========================================
COMMENTED OUT: LAYERED CHARACTER CREATOR
===========================================
This section contains the full character customization system with layered assets.
We'll implement this later - for now we're using pre-made character selection.

import LayeredCharacterPreview from "../components/LayeredCharacterPreview";

const CATEGORIES = [
  { id: 'body', label: 'Body', icon: '🧍' },
  { id: 'hair', label: 'Hair', icon: '💇' },
  { id: 'eyes', label: 'Eyes', icon: '👀' },
  { id: 'mouth', label: 'Mouth', icon: '👄' },
  { id: 'tops', label: 'Tops', icon: '👕' },
  { id: 'bottoms', label: 'Bottoms', icon: '👖' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'accessory', label: 'Accessory', icon: '🎩' },
  { id: 'effect', label: 'Effect', icon: '✨' },
  { id: 'background', label: 'Background', icon: '🖼️' },
];

// TODO: Implement layered character creator with proper asset positioning
// - Load assets from filesystem scanning
// - Allow selecting individual body parts
// - Preview with LayeredCharacterPreview component
// - Save equipped assets to backend
// - Render layered character in arena

===========================================
*/
