import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import { getContractAddresses } from '../../config/contracts';
import CashDuelABI from '../../contracts/abis/CashDuel.json';

const TIERS = [
  {
    id: 0,
    name: 'BRONZE',
    icon: '🥉',
    entryFee: '2',
    winAmount: '3.6',
    color: 'from-orange-400 via-orange-500 to-orange-600',
    borderColor: 'border-orange-700',
    description: 'Starter Stakes'
  },
  {
    id: 1,
    name: 'SILVER',
    icon: '🥈',
    entryFee: '10',
    winAmount: '18',
    color: 'from-gray-300 via-gray-400 to-gray-500',
    borderColor: 'border-gray-600',
    description: 'Mid Stakes',
    popular: true
  },
  {
    id: 2,
    name: 'GOLD',
    icon: '🥇',
    entryFee: '20',
    winAmount: '36',
    color: 'from-yellow-400 via-yellow-500 to-yellow-600',
    borderColor: 'border-yellow-700',
    description: 'High Stakes'
  }
];

function TierCard({ tier, userBalance, onSelect, isProcessing }) {
  const netProfit = (parseFloat(tier.winAmount) - parseFloat(tier.entryFee)).toFixed(1);
  const canAfford = parseFloat(userBalance) >= parseFloat(tier.entryFee);
  
  return (
    <div 
      className={`
        relative p-6 rounded-xl border-4 ${tier.borderColor}
        bg-gradient-to-br ${tier.color}
        ${!canAfford || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:shadow-2xl'}
        transition-all duration-300 shadow-lg text-white
      `}
      onClick={!canAfford || isProcessing ? null : onSelect}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 rounded-full text-xs font-black shadow-lg animate-pulse">
          ⭐ MOST POPULAR
        </div>
      )}
      
      <div className="text-center">
        <div className="text-6xl mb-3 drop-shadow-lg animate-bounce">{tier.icon}</div>
        <h3 className="text-2xl font-black mb-2 drop-shadow-md">{tier.name} DUEL</h3>
        <p className="text-xs opacity-90 mb-4">{tier.description}</p>
        
        <div className="space-y-3 text-left bg-black/20 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Entry Fee:</span>
            <span className="font-black text-lg">{tier.entryFee} MNT</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">If You Win:</span>
            <span className="font-black text-lg text-green-300">+{tier.winAmount} MNT</span>
          </div>
          
          <div className="flex justify-between items-center border-t-2 border-white/30 pt-2">
            <span className="text-sm font-semibold">Net Profit:</span>
            <span className="font-black text-xl text-green-400">+{netProfit} MNT</span>
          </div>
        </div>
        
        <button 
          className={`
            w-full mt-4 py-3 rounded-lg font-black text-lg
            ${canAfford && !isProcessing
              ? 'bg-white text-gray-900 hover:bg-gray-100 transform hover:scale-105' 
              : 'bg-gray-600 cursor-not-allowed'
            }
            transition-all shadow-lg
          `}
          disabled={!canAfford || isProcessing}
        >
          {!canAfford ? '❌ Insufficient Balance' : isProcessing ? 'PROCESSING...' : '⚔️ SELECT'}
        </button>
      </div>
    </div>
  );
}

export default function TierSelectionModal({ isOpen, onClose, onDuelCreated }) {
  const { signer, address } = useWeb3();
  const [userBalance, setUserBalance] = useState('0');
  const [selectedTier, setSelectedTier] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && signer) {
      fetchBalance();
    }
  }, [isOpen, signer]);

  async function fetchBalance() {
    try {
      const balance = await signer.provider.getBalance(address);
      setUserBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }

  function handleTierSelect(tier) {
    setSelectedTier(tier);
    setShowConfirmation(true);
  }

  function handleBack() {
    setShowConfirmation(false);
    setSelectedTier(null);
    setError('');
  }

  async function handleConfirm() {
    if (!selectedTier || !signer) return;

    setIsProcessing(true);
    setError('');

    try {
      // First, check if there's an existing waiting duel for this tier
      const checkResponse = await fetch('http://localhost:4000/api/cash-duel/active');
      const checkData = await checkResponse.json();
      
      console.log('[TierModal] Active duels:', checkData.activeDuels);
      
      const waitingDuel = checkData.activeDuels?.find(
        duel => duel.tier === selectedTier.id && 
                duel.status === 'WAITING' && // WAITING status
                duel.player1.toLowerCase() !== address.toLowerCase() // Not our own duel
      );
      
      console.log('[TierModal] Found waiting duel:', waitingDuel);

      const contractAddresses = getContractAddresses(5003);
      const contract = new ethers.Contract(
        contractAddresses.CashDuel,
        CashDuelABI,
        signer
      );

      let tx, receipt, duelId;

      if (waitingDuel) {
        // Join existing duel
        console.log('Joining existing duel:', waitingDuel.duelId);
        
        tx = await contract.joinDuel(waitingDuel.duelId, {
          value: ethers.parseEther(selectedTier.entryFee)
        });
        
        console.log('Join transaction sent:', tx.hash);
        receipt = await tx.wait();
        console.log('Join transaction confirmed:', receipt.hash);
        
        duelId = waitingDuel.duelId;
      } else {
        // Create new duel
        console.log('Creating new duel with tier:', selectedTier.id);
        
        tx = await contract.createDuel(selectedTier.id, {
          value: ethers.parseEther(selectedTier.entryFee)
        });

        console.log('Create transaction sent:', tx.hash);
        receipt = await tx.wait();
        console.log('Create transaction confirmed:', receipt.hash);

        // Parse DuelCreated event for new duels
        const duelCreatedEvent = receipt.logs
          .map(log => {
            try {
              return contract.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find(event => event && event.name === 'DuelCreated');

        if (!duelCreatedEvent) {
          throw new Error('DuelCreated event not found');
        }

        duelId = duelCreatedEvent.args.duelId.toString();
      }

      // Call backend to register/join duel
      const endpoint = waitingDuel ? 'join' : 'create';
      const response = await fetch(`http://localhost:4000/api/cash-duel/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier.id,
          transactionHash: receipt.hash,
          address,
          duelId: waitingDuel ? duelId : undefined
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Backend registration failed');
      }

      // If we joined, navigate directly to arena
      if (waitingDuel) {
        // Notify parent to navigate to arena immediately
        onDuelCreated({
          duelId,
          tier: selectedTier,
          txHash: receipt.hash,
          battleReady: true // Signal that we should go straight to arena
        });
      } else {
        // We created, show waiting screen
        onDuelCreated({
          duelId,
          tier: selectedTier,
          txHash: receipt.hash,
          battleReady: false
        });
      }
      
      handleClose();

    } catch (err) {
      console.error('Error creating duel:', err);
      setError(err.message || 'Failed to create duel');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleClose() {
    onClose();
    setShowConfirmation(false);
    setSelectedTier(null);
    setError('');
    setIsProcessing(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isProcessing ? null : handleClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto border-4 border-yellow-500">
        
        {!showConfirmation ? (
          // Tier Selection View
          <>
            <div className="p-8 border-b-2 border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    💰 CASH DUEL
                  </h2>
                  <p className="text-gray-400 font-semibold mt-2">Winner takes 90% • Loser gets nothing</p>
                </div>
                <button 
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white text-3xl font-bold"
                  disabled={isProcessing}
                >
                  ✕
                </button>
              </div>

              <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-2 border-emerald-500 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-300 font-semibold">Your Balance</span>
                  <span className="text-3xl font-black text-white">{parseFloat(userBalance).toFixed(4)} MNT</span>
                </div>
              </div>
            </div>

            <div className="p-8">
              <h3 className="text-2xl font-black text-white mb-6 text-center">Choose Your Stakes</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {TIERS.map(tier => (
                  <TierCard
                    key={tier.id}
                    tier={tier}
                    userBalance={userBalance}
                    onSelect={() => handleTierSelect(tier)}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>

              <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-300">
                  <span className="font-black text-lg">⚠️ WARNING:</span> If you lose, you will lose your entire entry fee. Only battle if you're confident in your skills!
                </p>
              </div>

              <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-4">
                <p className="text-xs text-blue-300 leading-relaxed">
                  <span className="font-bold">ℹ️ How it works:</span> Both players pay entry fee → Battle in arena → Smart contract automatically pays winner → Platform fee: 10% → This is skill-based gaming, not gambling
                </p>
              </div>
            </div>
          </>
        ) : (
          // Confirmation View
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-bounce">{selectedTier.icon}</div>
              <h2 className="text-3xl font-black text-white mb-2">Confirm {selectedTier.name} Duel</h2>
              <p className="text-gray-400">Review before entering the arena</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 mb-6 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300">Tier:</span>
                <span className="font-black text-white">{selectedTier.icon} {selectedTier.name}</span>
              </div>
              
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300">Entry Fee:</span>
                <span className="font-black text-red-400 text-2xl">-{selectedTier.entryFee} MNT</span>
              </div>
              
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300">Potential Win:</span>
                <span className="font-black text-green-400 text-2xl">+{selectedTier.winAmount} MNT</span>
              </div>
              
              <div className="border-t-2 border-gray-700 pt-4 flex justify-between items-center">
                <span className="text-gray-300 font-semibold">Balance After Entry:</span>
                <span className="font-black text-white text-xl">
                  {(parseFloat(userBalance) - parseFloat(selectedTier.entryFee)).toFixed(4)} MNT
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4 mb-4">
                <p className="text-red-300 font-semibold">❌ {error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={handleBack}
                disabled={isProcessing}
                className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 text-white font-black rounded-xl text-lg transition-all disabled:opacity-50"
              >
                ← BACK
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    PROCESSING...
                  </span>
                ) : (
                  '⚔️ CONFIRM & ENTER'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
