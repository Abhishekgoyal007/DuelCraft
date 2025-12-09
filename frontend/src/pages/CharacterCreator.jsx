// src/pages/CharacterCreator.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { Link } from "react-router-dom";
import { CHARACTER_LIST } from "../config/characters";
import { ethers } from "ethers";
import { getContractAddresses } from "../config/contracts";
import DuelCraftCharacterABI from "../contracts/abis/DuelCraftCharacter.json";
import { FloatingNav } from "../components/FloatingNav";
import { useToast } from "../context/ToastContext";

// Use characters from config
const PREMADE_CHARACTERS = CHARACTER_LIST;

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
  const [ownedNFTCharacter, setOwnedNFTCharacter] = useState(null);

  // Check if user owns an NFT and which character it is
  useEffect(() => {
    async function checkOwnedNFT() {
      if (!user?.address) return;

      try {
        const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.mantle.xyz');
        const contractAddresses = getContractAddresses(5003);
        const characterContract = new ethers.Contract(
          contractAddresses.DuelCraftCharacter,
          DuelCraftCharacterABI,
          provider
        );

        const tokenId = await characterContract.walletToCharacter(user.address);

        if (tokenId > 0) {
          // User owns an NFT, get the character data
          const characterData = await characterContract.getCharacter(tokenId);
          console.log('[CharacterCreator] User owns NFT:', tokenId.toString(), 'Character:', characterData.characterType);
          setOwnedNFTCharacter(characterData.characterType);
        } else {
          setOwnedNFTCharacter(null);
        }
      } catch (err) {
        console.error('[CharacterCreator] Failed to check owned NFT:', err);
      }
    }

    checkOwnedNFT();
  }, [user]);

  // Check character availability on blockchain
  useEffect(() => {
    async function checkAvailability() {
      if (!contracts?.character || !isConnected) {
        console.log('[CharacterCreator] Skipping availability check:', { hasContracts: !!contracts?.character, isConnected });
        return;
      }

      console.log('[CharacterCreator] Checking character availability...');
      setCheckingAvailability(true);
      try {
        const availability = {};

        for (const char of PREMADE_CHARACTERS) {
          const isAvailable = await contracts.character.isCharacterAvailable(char.name);
          console.log(`[CharacterCreator] ${char.name} available:`, isAvailable);
          availability[char.id] = isAvailable;
        }

        console.log('[CharacterCreator] Final availability:', availability);
        setCharacterAvailability(availability);
      } catch (err) {
        console.error('[CharacterCreator] Failed to check character availability:', err);
      } finally {
        setCheckingAvailability(false);
      }
    }

    checkAvailability();
  }, [contracts, isConnected]);

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

  // Mint character NFT on blockchain
  async function handleMintNFT() {
    console.log('[CharacterCreator] Mint clicked!', { selectedCharacter, isConnected, isCorrectChain });

    if (!selectedCharacter) {
      alert("Please select a character first!");
      return;
    }

    // Check wallet connection
    if (!isConnected) {
      console.log('[CharacterCreator] Wallet not connected, connecting...');
      const connected = await connect();
      if (!connected) {
        alert("Please connect your wallet to mint an NFT");
        return;
      }
    }

    // Check correct network
    if (!isCorrectChain) {
      console.log('[CharacterCreator] Wrong network, switching to Mantle...');
      const switched = await switchToMantleNetwork();
      if (!switched) {
        alert("Please switch to Mantle Testnet to mint your character NFT");
        return;
      }
    }

    setMinting(true);
    console.log('[CharacterCreator] Starting mint process...');

    try {
      // Save character selection first
      if (!saved) {
        console.log('[CharacterCreator] Saving character first...');
        await saveCharacter();
      }

      // Convert character selection to customization format
      // Get character name
      const characterData = PREMADE_CHARACTERS.find(c => c.id === selectedCharacter);
      const characterName = characterData?.name || 'warrior';
      console.log('[CharacterCreator] Minting character:', characterName);

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
      console.log('[CharacterCreator] Calling mintCharacter with:', { characterName, customization });
      const result = await mintCharacter(characterName, customization);
      console.log('[CharacterCreator] Mint successful!', result);

      setMintSuccess(true);
      setTxHash(result.txHash);

      // Show success message
      setTimeout(() => {
        setMintSuccess(false);
      }, 10000);

    } catch (err) {
      console.error('[CharacterCreator] Mint error:', err);
      console.error('[CharacterCreator] Error details:', {
        message: err.message,
        code: err.code,
        reason: err.reason,
        data: err.data
      });

      // Parse error messages
      if (err.message && (err.message.includes("Already owns a character") || err.message.includes("Already owns"))) {
        console.log('[CharacterCreator] Error: User already owns character');
        alert("❌ You already own a character NFT!\n\nEach wallet can only mint ONE character.\n\nYou can view your NFT on the Hub page.");
      } else if (err.message && (err.message.includes("Character already minted") || err.message.includes("already minted by another player"))) {
        console.log('[CharacterCreator] Error: Character already taken');
        alert("❌ This character is already taken!\n\n🔒 Someone else has minted this rare character.\n\nPlease select a different character.");
        // Refresh availability
        window.location.reload();
      } else if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        console.log('[CharacterCreator] Error: User cancelled transaction');
        alert("Transaction cancelled by user");
      } else if (err.message && err.message.includes("insufficient funds")) {
        console.log('[CharacterCreator] Error: Insufficient funds');
        alert("❌ Insufficient MNT for gas fees.\n\nPlease get testnet MNT from the Mantle faucet.");
      } else {
        console.log('[CharacterCreator] Error: Unknown error');
        alert(`❌ Failed to mint NFT:\n\n${err.message || err.reason || "Unknown error"}`);
      }
    } finally {
      console.log('[CharacterCreator] Mint process finished');
      setMinting(false);
    }
  }

  const selectedCharData = PREMADE_CHARACTERS.find(c => c.id === selectedCharacter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f1729] to-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⚔️</div>
          <div className="text-white text-xl font-bold animate-pulse">Loading characters...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Forge Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/assets/background/forge.png)',
          backgroundPosition: 'center bottom'
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Floating embers/particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              background: `rgba(${Math.random() > 0.5 ? '255, 165, 0' : '255, 100, 50'}, ${0.4 + Math.random() * 0.4})`,
              animationDelay: Math.random() * 5 + 's',
              animationDuration: 4 + Math.random() * 4 + 's',
              boxShadow: '0 0 6px rgba(255, 165, 0, 0.6)'
            }}
          />
        ))}
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-4xl">🔥</span>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent tracking-wide drop-shadow-lg">
              CHARACTER FORGE
            </h1>
            <span className="text-4xl">🔥</span>
          </div>
          <p className="text-orange-200/80 text-lg font-medium">Choose your legendary fighter</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Selected Character Preview */}
          <div className="lg:col-span-1">
            <div
              className="p-6 rounded-2xl h-full animate-slide-up"
              style={{
                background: 'linear-gradient(145deg, rgba(251, 146, 60, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                border: '2px solid rgba(251, 146, 60, 0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px rgba(251, 146, 60, 0.15)'
              }}
            >
              <h3 className="text-center font-bold text-orange-400 mb-6 text-lg tracking-wider uppercase">
                🔥 Selected Fighter
              </h3>

              {selectedCharData ? (
                <div className="text-center">
                  <div
                    className="relative mx-auto w-40 h-40 rounded-xl mb-4 flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, rgba(0,0,0,0.5) 0%, rgba(251,146,60,0.1) 100%)',
                      border: '3px solid rgba(251, 146, 60, 0.5)',
                      boxShadow: '0 0 30px rgba(251, 146, 60, 0.3)'
                    }}
                  >
                    {selectedCharData.image ? (
                      <img
                        src={selectedCharData.image}
                        alt={selectedCharData.name}
                        className="w-32 h-32 object-contain animate-pulse-glow"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="text-7xl">{selectedCharData.icon}</div>
                    )}
                  </div>

                  <h4 className="text-2xl font-black text-white mb-2">{selectedCharData.name}</h4>
                  <p className="text-gray-400 text-sm mb-4">{selectedCharData.description}</p>

                  <div className="flex items-center justify-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-white/20"
                      style={{ backgroundColor: selectedCharData.color }}
                    />
                    <div className="text-left text-xs text-gray-400">
                      <div>Theme: {selectedCharData.color}</div>
                      <div className="text-green-400 font-bold">✓ Battle Ready</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-6xl mb-4 opacity-50">❓</div>
                  <p>Select a character from the roster</p>
                </div>
              )}
            </div>
          </div>

          {/* Character Grid */}
          <div className="lg:col-span-2">
            <div
              className="p-6 rounded-2xl animate-slide-up"
              style={{
                background: 'linear-gradient(145deg, rgba(0,0,0,0.5) 0%, rgba(245, 158, 11, 0.05) 100%)',
                border: '2px solid rgba(245, 158, 11, 0.2)',
                backdropFilter: 'blur(20px)',
                animationDelay: '0.1s'
              }}
            >
              <h3 className="text-center font-bold text-amber-400 mb-6 text-lg tracking-wider uppercase">
                ⚔️ Fighter Roster
              </h3>

              {checkingAvailability && (
                <div className="text-center py-4 text-amber-400 font-medium animate-pulse">
                  🔍 Scanning blockchain for availability...
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {PREMADE_CHARACTERS.map((char, index) => {
                  const isSelected = selectedCharacter === char.id;
                  const isAvailable = characterAvailability[char.id];
                  const isOwnedByUser = ownedNFTCharacter === char.name;
                  const isTaken = isAvailable === false && !isOwnedByUser;

                  return (
                    <button
                      key={char.id}
                      onClick={() => !isTaken && selectCharacter(char.id)}
                      disabled={isTaken}
                      className={`relative p-4 rounded-xl transition-all duration-300 animate-fade-in ${isTaken
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-105 cursor-pointer'
                        }`}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        background: isTaken
                          ? 'linear-gradient(145deg, rgba(239,68,68,0.1) 0%, rgba(0,0,0,0.4) 100%)'
                          : isOwnedByUser
                            ? 'linear-gradient(145deg, rgba(168,85,247,0.2) 0%, rgba(0,0,0,0.4) 100%)'
                            : isSelected
                              ? 'linear-gradient(145deg, rgba(34,197,94,0.2) 0%, rgba(0,0,0,0.4) 100%)'
                              : 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%)',
                        border: isTaken
                          ? '2px solid rgba(239,68,68,0.5)'
                          : isOwnedByUser
                            ? '2px solid rgba(168,85,247,0.6)'
                            : isSelected
                              ? '3px solid rgba(34,197,94,0.8)'
                              : '2px solid rgba(255,255,255,0.1)',
                        boxShadow: isSelected && !isTaken
                          ? '0 0 30px rgba(34,197,94,0.4)'
                          : isOwnedByUser
                            ? '0 0 20px rgba(168,85,247,0.3)'
                            : 'none'
                      }}
                    >
                      {/* Badges */}
                      {isOwnedByUser && (
                        <div className="absolute -top-2 -right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                          🎨 YOUR NFT
                        </div>
                      )}
                      {isTaken && (
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                          🔒 TAKEN
                        </div>
                      )}
                      {isSelected && !isTaken && !isOwnedByUser && (
                        <div className="absolute -top-2 -right-2 bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-10 font-bold">
                          ✓
                        </div>
                      )}

                      <div className={isTaken ? 'filter grayscale' : ''}>
                        {char.image ? (
                          <img
                            src={char.image}
                            alt={char.name}
                            className="w-20 h-20 mx-auto mb-3 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div className="text-5xl mb-3 text-center">{char.icon}</div>
                        )}
                      </div>

                      <div className="text-center font-bold text-white text-sm mb-1">{char.name}</div>
                      <div className={`text-xs text-center ${isTaken ? 'text-red-400' : isOwnedByUser ? 'text-purple-400' : 'text-gray-400'
                        }`}>
                        {isTaken ? '❌ Already Owned' : isOwnedByUser ? '✅ Your NFT' : char.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={saveCharacter}
                  disabled={saving || !user?.address || !selectedCharacter}
                  className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${saving || !selectedCharacter
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-[1.02] shadow-lg shadow-cyan-500/20'
                    }`}
                >
                  {saving ? '💾 Saving...' : '💾 Save Character Selection'}
                </button>

                {saved && (
                  <div className="text-center text-green-400 font-semibold animate-bounce-in">
                    ✅ Character saved successfully!
                  </div>
                )}

                {/* Mint NFT Button */}
                <button
                  onClick={handleMintNFT}
                  disabled={minting || !selectedCharacter || characterAvailability[selectedCharacter] === false}
                  className={`relative w-full py-4 rounded-xl font-black text-white text-lg transition-all duration-300 overflow-hidden ${characterAvailability[selectedCharacter] === false
                    ? 'bg-gray-700 cursor-not-allowed opacity-60'
                    : mintSuccess
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 animate-pulse'
                      : minting
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-600'
                        : 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:scale-[1.02] shadow-lg shadow-purple-500/30'
                    }`}
                  style={{
                    backgroundSize: '200% 100%',
                    animation: !minting && !mintSuccess && characterAvailability[selectedCharacter] !== false
                      ? 'shimmer 3s infinite'
                      : undefined
                  }}
                >
                  <span className="relative z-10">
                    {characterAvailability[selectedCharacter] === false
                      ? '🔒 CHARACTER TAKEN'
                      : mintSuccess
                        ? '✅ NFT MINTED!'
                        : minting
                          ? '⏳ MINTING ON CHAIN...'
                          : '🎨 MINT CHARACTER NFT'}
                  </span>
                </button>

                {/* Success message */}
                {mintSuccess && txHash && (
                  <div
                    className="p-4 rounded-xl text-center animate-bounce-in"
                    style={{
                      background: 'linear-gradient(145deg, rgba(34,197,94,0.2) 0%, rgba(0,0,0,0.3) 100%)',
                      border: '2px solid rgba(34,197,94,0.5)'
                    }}
                  >
                    <p className="text-green-400 font-bold mb-2">
                      🎉 Character NFT Minted Successfully!
                    </p>
                    <a
                      href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline hover:text-cyan-300 text-sm"
                    >
                      View on Mantle Explorer →
                    </a>
                  </div>
                )}

                {!user?.address && (
                  <div className="text-center text-amber-400 text-sm">
                    ⚠️ Connect wallet to save and mint
                  </div>
                )}

                <Link to="/hub" className="block">
                  <button className="w-full py-3 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-bold rounded-xl transition-all duration-300 border border-gray-600/30 hover:border-gray-500/50">
                    ← Back to Hub
                  </button>
                </Link>
              </div>
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
