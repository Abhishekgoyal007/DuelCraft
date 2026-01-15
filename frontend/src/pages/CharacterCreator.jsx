// src/pages/CharacterCreator.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { Link } from "react-router-dom";
import { CHARACTER_LIST } from "../config/characters";
import AnimatedCharacterPreview from "../components/AnimatedCharacterPreview";

// Use characters from config
const PREMADE_CHARACTERS = CHARACTER_LIST;

// Element colors for styling
const ELEMENT_COLORS = {
  fire: 'from-orange-500 to-red-600',
  ice: 'from-cyan-400 to-blue-600',
  lightning: 'from-yellow-400 to-amber-600',
  shadow: 'from-purple-600 to-indigo-900',
  earth: 'from-amber-600 to-stone-700',
  wind: 'from-emerald-400 to-teal-500',
  light: 'from-yellow-300 to-amber-400',
  dark: 'from-purple-800 to-gray-900',
  blood: 'from-red-600 to-red-900',
  poison: 'from-green-500 to-emerald-700',
  metal: 'from-gray-400 to-slate-600',
  spirit: 'from-cyan-300 to-blue-400',
  beast: 'from-amber-500 to-orange-700',
  moon: 'from-indigo-400 to-purple-600',
  nature: 'from-green-400 to-emerald-600',
  neutral: 'from-gray-500 to-gray-700'
};

// ok lets see duel system now i will provide u the two players balance ok like of mnt in this they both gona play in silver ok and after winning lets see will the value of the guys who has approx 93. somthing mnt will get increase or not ok so lets see the working of this ok will do for silver duel 

export default function CharacterCreator() {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const { isConnected, connect, mintCharacter, isCorrectChain, switchToMantleNetwork, contracts } = useWeb3();

  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [characterAvailability, setCharacterAvailability] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [filterElement, setFilterElement] = useState('all');
  const [ownedCharacterName, setOwnedCharacterName] = useState(null); // Track user's owned NFT

  // Check character availability on blockchain 
  useEffect(() => {
    async function checkAvailability() {
      if (!contracts?.character || !isConnected) return;

      setCheckingAvailability(true);
      try {
        const availability = {};

        for (const char of PREMADE_CHARACTERS) {
          const isAvailable = await contracts.character.isCharacterAvailable(char.name);
          availability[char.id] = isAvailable;
        }

        setCharacterAvailability(availability);

        // Also check if user owns any character NFT
        if (user?.address) {
          try {
            const tokenId = await contracts.character.walletToCharacter(user.address);
            if (tokenId > 0) {
              // User has an NFT, get the character name
              const charData = await contracts.character.characters(tokenId);
              if (charData && charData.characterType) {
                setOwnedCharacterName(charData.characterType);
              }
            }
          } catch (err) {
            console.log("No owned character NFT found");
          }
        }
      } catch (err) {
        console.error("Failed to check character availability:", err);
      } finally {
        setCheckingAvailability(false);
      }
    }

    checkAvailability();
  }, [contracts, isConnected, user?.address]);

  // Load player's selected character on mount
  useEffect(() => {
    async function loadCharacter() {
      if (!user?.address) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(`http://localhost:4000/profile?address=${user.address}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

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

  // Mint character NFT on blockchain
  async function handleMintNFT() {
    if (!selectedCharacter) {
      alert("Please select a character first!");
      return;
    }

    // Check wallet connection
    if (!isConnected) {
      const connected = await connect();
      if (!connected) {
        alert("Please connect your wallet to mint an NFT");
        return;
      }
    }

    // Check correct network
    if (!isCorrectChain) {
      const switched = await switchToMantleNetwork();
      if (!switched) {
        alert("Please switch to Mantle Testnet to mint your character NFT");
        return;
      }
    }

    setMinting(true);
    try {
      // Save character selection first
      if (!saved) {
        await saveCharacter();
      }

      // Convert character selection to customization format
      // Get character name
      const characterData = PREMADE_CHARACTERS.find(c => c.id === selectedCharacter);
      const characterName = characterData?.name || 'warrior';

      // Create customization object (default values for premade characters)
      const customization = {
        body: 0,
        hair: 0,
        hairColor: 0,
        eyes: 0,
        mouth: 0,
        tops: 0,
        topColor: 0,
        bottoms: 0,
        bottomColor: 0,
        shoes: 0,
        accessory: 0,
        background: 0,
        effect: 0,
      };

      // Mint NFT on blockchain with character type and customization
      const result = await mintCharacter(characterName, customization);

      setMintSuccess(true);
      setTxHash(result.txHash);

      // Show success message
      setTimeout(() => {
        setMintSuccess(false);
      }, 10000);

    } catch (err) {
      console.error("Mint error:", err);

      // Parse error messages
      if (err.message && (err.message.includes("Already owns a character") || err.message.includes("Already owns"))) {
        alert("❌ You already own a character NFT!\n\nEach wallet can only mint ONE character.\n\nYou can view your NFT on the Hub page.");
      } else if (err.message && (err.message.includes("Character already minted") || err.message.includes("already minted by another player"))) {
        alert("❌ This character is already taken!\n\n🔒 Someone else has minted this rare character.\n\nPlease select a different character.");
        // Refresh availability
        window.location.reload();
      } else if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        alert("Transaction cancelled by user");
      } else if (err.message && err.message.includes("insufficient funds")) {
        alert("❌ Insufficient MNT for gas fees.\n\nPlease get testnet MNT from the Mantle faucet.");
      } else {
        alert(`❌ Failed to mint NFT:\n\n${err.message || err.reason || "Unknown error"}`);
      }
    } finally {
      setMinting(false);
    }
  }

  const selectedCharData = PREMADE_CHARACTERS.find(c => c.id === selectedCharacter);

  // Get unique elements for filter
  const elements = ['all', ...new Set(PREMADE_CHARACTERS.map(c => c.element))];

  // Filter characters by element
  const filteredCharacters = filterElement === 'all'
    ? PREMADE_CHARACTERS
    : PREMADE_CHARACTERS.filter(c => c.element === filterElement);

  if (loading && user?.address) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-xl animate-pulse">Loading warriors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 mb-2"
            style={{ fontFamily: "'Press Start 2P', system-ui", textShadow: '0 0 30px rgba(255,165,0,0.5)' }}>
            ⚔️ FORGE HERO ⚔️
          </h1>
          <p className="text-gray-300 text-sm">Choose your legendary warrior • {PREMADE_CHARACTERS.length} heroes available</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Selected Character Preview */}
          <div className="lg:col-span-1">
            {selectedCharData ? (
              <div className="sticky top-4 bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-4 shadow-2xl">
                <h3 className="text-center font-bold text-amber-400 mb-4 text-sm uppercase tracking-wider">Selected Hero</h3>

                {/* Character Image - Static Only */}
                <div className={`relative mx-auto w-full aspect-square rounded-xl overflow-hidden mb-4 bg-gradient-to-br ${ELEMENT_COLORS[selectedCharData.element] || ELEMENT_COLORS.neutral}`}>
                  <div className="absolute inset-0 bg-black/30"></div>
                  {selectedCharData.image ? (
                    // Static image for all characters
                    <img
                      src={selectedCharData.image}
                      alt={selectedCharData.name}
                      className="w-full h-full object-contain relative z-10"
                      style={{
                        imageRendering: 'pixelated',
                        transform: `scale(${selectedCharData.displayScale || 1.2})`
                      }}
                    />
                  ) : (
                    <div className="text-8xl flex items-center justify-center h-full">{selectedCharData.icon}</div>
                  )}
                  {/* Element Badge */}
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full text-xs text-white capitalize z-20">
                    {selectedCharData.element}
                  </div>
                </div>

                {/* Character Info */}
                <h4 className="text-xl font-bold text-white text-center mb-1">{selectedCharData.name}</h4>
                <p className="text-gray-400 text-xs text-center mb-3">{selectedCharData.description}</p>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  {Object.entries(selectedCharData.stats).map(([stat, value]) => (
                    <div key={stat} className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs uppercase w-16">{stat}</span>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${stat === 'health' ? 'from-green-500 to-emerald-400' :
                            stat === 'attack' ? 'from-red-500 to-orange-400' :
                              stat === 'defense' ? 'from-blue-500 to-cyan-400' :
                                'from-yellow-500 to-amber-400'
                            }`}
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs w-8">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Superpower */}
                <div className="bg-purple-900/50 border border-purple-500/30 rounded-lg p-3 mb-4">
                  <div className="text-purple-300 text-xs font-bold mb-1">⚡ SUPERPOWER</div>
                  <div className="text-gray-300 text-xs">{selectedCharData.superpower}</div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={saveCharacter}
                    disabled={saving || !user?.address || !selectedCharacter}
                    className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${saving || !selectedCharacter
                      ? 'bg-gray-600 text-gray-400'
                      : saved
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                      }`}
                  >
                    {saving ? '💾 Saving...' : saved ? '✓ Saved!' : '💾 Save Character'}
                  </button>

                  <button
                    onClick={handleMintNFT}
                    disabled={minting || !selectedCharacter || characterAvailability[selectedCharacter] === false}
                    className={`w-full py-3 rounded-lg font-black text-sm transition-all ${characterAvailability[selectedCharacter] === false
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : mintSuccess
                        ? 'bg-gradient-to-r from-green-400 to-green-600 animate-pulse text-white'
                        : minting
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black'
                          : 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white'
                      }`}
                  >
                    {characterAvailability[selectedCharacter] === false
                      ? '🔒 TAKEN'
                      : mintSuccess
                        ? '✓ MINTED!'
                        : minting
                          ? '⏳ MINTING...'
                          : '🎨 MINT NFT'}
                  </button>
                </div>

                {/* Success message */}
                {mintSuccess && txHash && (
                  <div className="mt-3 bg-green-900/50 border border-green-500/30 rounded-lg p-2">
                    <p className="text-green-400 font-bold text-xs text-center mb-1">🎉 NFT Minted!</p>
                    <a
                      href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline hover:text-blue-300 text-xs block text-center"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}

                {!user?.address && (
                  <p className="text-center text-red-400 text-xs mt-2">Connect wallet to save</p>
                )}

                <Link to="/hub" className="block mt-3">
                  <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-semibold text-sm transition-colors">
                    ← Back to Hub
                  </button>
                </Link>
              </div>
            ) : (
              <div className="sticky top-4 bg-gray-800/50 border border-gray-600/30 rounded-2xl p-6 text-center">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-400">Select a hero from the grid</p>
              </div>
            )}
          </div>

          {/* Right Side - Character Grid */}
          <div className="lg:col-span-3">
            {/* Element Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {elements.map(element => (
                <button
                  key={element}
                  onClick={() => setFilterElement(element)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${filterElement === element
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {element === 'all' ? '🌟 All' : element}
                </button>
              ))}
            </div>

            {/* Character Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredCharacters.map(char => {
                const isSelected = selectedCharacter === char.id;
                const isAvailable = characterAvailability[char.id];
                const isTaken = isAvailable === false;
                const isOwned = ownedCharacterName && char.name === ownedCharacterName;
                const canSelect = !isTaken || isOwned; // Can select if available OR if user owns it

                return (
                  <button
                    key={char.id}
                    onClick={() => canSelect && selectCharacter(char.id)}
                    disabled={!canSelect}
                    className={`relative p-3 rounded-xl border-2 transition-all transform hover:scale-105 ${isOwned
                      ? 'border-green-400 bg-green-900/30 ring-2 ring-green-400/50'
                      : isTaken
                        ? 'border-red-500/50 bg-gray-800/30 opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'border-amber-400 bg-amber-900/30 ring-2 ring-amber-400/50 scale-105'
                          : 'border-gray-600/50 bg-gray-800/50 hover:border-amber-500/50 hover:bg-gray-700/50'
                      }`}
                  >
                    {/* Owned Badge */}
                    {isOwned && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-black shadow-lg z-10">
                        ✓ OWNED
                      </div>
                    )}

                    {/* Taken Badge - only show if not owned */}
                    {isTaken && !isOwned && (
                      <div className="absolute -top-1 -right-1 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-black shadow-lg z-10">
                        🔒
                      </div>
                    )}

                    {/* Selected Indicator - only show if not owned badge */}
                    {isSelected && !isTaken && !isOwned && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10 text-sm font-bold">
                        ✓
                      </div>
                    )}

                    {/* Character Image */}
                    <div className={`relative w-full aspect-square rounded-lg overflow-hidden mb-2 bg-gradient-to-br ${ELEMENT_COLORS[char.element] || ELEMENT_COLORS.neutral} ${isTaken && !isOwned ? 'grayscale' : ''}`}>
                      <div className="absolute inset-0 bg-black/20"></div>
                      {char.image ? (
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-contain relative z-10"
                          style={{
                            imageRendering: 'pixelated',
                            transform: `scale(${char.displayScale || 1.6}) translateX(${char.displayOffsetX || 0}%)`
                          }}
                        />
                      ) : (
                        <div className="text-4xl flex items-center justify-center h-full relative z-10">{char.icon}</div>
                      )}
                    </div>

                    {/* Character Name */}
                    <div className="text-center">
                      <div className={`font-bold text-xs truncate ${isTaken && !isOwned ? 'text-gray-500' : isOwned ? 'text-green-400' : 'text-white'}`}>
                        {char.name.split(' ')[0]}
                      </div>
                      <div className={`text-xs capitalize ${isTaken && !isOwned ? 'text-gray-600' : 'text-gray-400'}`}>
                        {char.element}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stats Legend */}
            <div className="mt-6 bg-gray-800/50 border border-gray-600/30 rounded-xl p-4">
              <h4 className="text-amber-400 font-bold text-sm mb-3">📊 Stats Guide</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-emerald-400"></div>
                  <span className="text-gray-300">Health - Survivability</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-orange-400"></div>
                  <span className="text-gray-300">Attack - Damage output</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                  <span className="text-gray-300">Defense - Damage reduction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-yellow-500 to-amber-400"></div>
                  <span className="text-gray-300">Speed - Action priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
