// src/pages/CharacterCreator.jsx
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { Link } from "react-router-dom";
import { CHARACTER_LIST } from "../config/characters";
import { ethers } from "ethers";
import { getContractAddresses } from "../config/contracts";
import DuelCraftCharacterABI from "../contracts/abis/DuelCraftCharacter.json";

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
            
            {/* Loading overlay for availability check */}
            {checkingAvailability && (
              <div className="text-center py-4 text-amber-700 font-bold">
                🔍 Checking character availability on blockchain...
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {PREMADE_CHARACTERS.map(char => {
                const isSelected = selectedCharacter === char.id;
                const isAvailable = characterAvailability[char.id];
                const isOwnedByUser = ownedNFTCharacter === char.name;
                const isTaken = isAvailable === false && !isOwnedByUser; // Taken if not available AND not owned by user
                
                return (
                  <button
                    key={char.id}
                    onClick={() => !isTaken && selectCharacter(char.id)}
                    disabled={isTaken}
                    className={`relative p-4 rounded-xl border-4 transition-all ${
                      isTaken 
                        ? 'border-red-400 bg-red-50 opacity-60 cursor-not-allowed'
                        : isOwnedByUser
                        ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-300'
                        : isSelected
                        ? 'border-green-500 bg-green-100 ring-4 ring-green-400 scale-105 transform'
                        : 'border-amber-300 bg-amber-50 hover:border-amber-500 hover:scale-105 transform'
                    }`}
                  >
                    {/* Owned NFT Badge */}
                    {isOwnedByUser && (
                      <div className="absolute -top-2 -right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg z-10 border-2 border-white">
                        🎨 NFT
                      </div>
                    )}
                    
                    {/* Taken Badge */}
                    {isTaken && (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg z-10 border-2 border-white">
                        🔒 TAKEN
                      </div>
                    )}
                    
                    {/* Selected Checkmark */}
                    {isSelected && !isTaken && (
                      <div className="absolute -top-2 -right-2 bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10 border-2 border-white">
                        ✓
                      </div>
                    )}
                    
                    <div className={isTaken ? 'filter grayscale' : ''}>
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
                    </div>
                    <div className="text-center font-bold text-amber-900 mb-1">{char.name}</div>
                    <div className={`text-xs text-center mb-2 ${isTaken ? 'text-red-600 font-bold' : isOwnedByUser ? 'text-purple-600 font-bold' : 'text-amber-700'}`}>
                      {isTaken ? '❌ Already Owned' : isOwnedByUser ? '✅ Your NFT' : char.description}
                    </div>
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

              {/* Mint NFT Button */}
              <button
                onClick={handleMintNFT}
                disabled={minting || !selectedCharacter || characterAvailability[selectedCharacter] === false}
                className={`w-full py-4 rounded-lg font-black text-white transition-all transform hover:scale-105 shadow-xl ${
                  characterAvailability[selectedCharacter] === false
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : mintSuccess
                    ? 'bg-gradient-to-r from-green-400 to-green-600 animate-pulse'
                    : minting
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-75'
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                }`}
              >
                {characterAvailability[selectedCharacter] === false 
                  ? '🔒 CHARACTER TAKEN' 
                  : mintSuccess 
                  ? '✓ NFT MINTED!' 
                  : minting 
                  ? '⏳ MINTING...' 
                  : '🎨 MINT CHARACTER NFT'}
              </button>

              {/* Success message with transaction link */}
              {mintSuccess && txHash && (
                <div className="bg-green-100 border-4 border-green-500 rounded-xl p-4">
                  <p className="text-green-800 font-bold text-center mb-2">
                    🎉 Character NFT Minted Successfully!
                  </p>
                  <a
                    href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 underline hover:text-purple-900 text-sm block text-center"
                  >
                    View on Explorer →
                  </a>
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
