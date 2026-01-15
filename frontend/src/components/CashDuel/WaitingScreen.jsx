import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractAddresses } from '../../config/contracts';
import CashDuelABI from '../../contracts/abis/CashDuel.json';
import { useWeb3 } from '../../context/Web3Context';

export default function WaitingScreen({ duelInfo, onCancel, onOpponentJoined }) {
  const { signer } = useWeb3();
  const [timeWaiting, setTimeWaiting] = useState(0);
  const [isCanceling, setIsCanceling] = useState(false);
  const [canCancel, setCanCancel] = useState(false);

  useEffect(() => {
    // Start timer
    const timer = setInterval(() => {
      setTimeWaiting(prev => prev + 1);
    }, 1000);

    // Enable cancel after 5 minutes
    const cancelTimer = setTimeout(() => {
      setCanCancel(true);
    }, 300000); // 5 minutes

    return () => {
      clearInterval(timer);
      clearTimeout(cancelTimer);
    };
  }, []);

  useEffect(() => {
    // Poll for opponent
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`https://duelcraft-backend.onrender.com/api/cash-duel/poll/${duelInfo.duelId}`);
        const data = await response.json();

        if (data.success && data.battleReady) {
          // Opponent joined!
          onOpponentJoined({
            player1: duelInfo.txHash, // Will be fetched properly
            player2: data.player2
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [duelInfo.duelId, onOpponentJoined]);

  async function handleCancel() {
    if (!canCancel || isCanceling) return;

    setIsCanceling(true);
    try {
      const contractAddresses = getContractAddresses(5003);
      const contract = new ethers.Contract(
        contractAddresses.CashDuel,
        CashDuelABI,
        signer
      );

      const tx = await contract.cancelDuel(duelInfo.duelId);
      await tx.wait();

      onCancel();
    } catch (err) {
      console.error('Error canceling duel:', err);
      alert('Failed to cancel duel: ' + err.message);
    } finally {
      setIsCanceling(false);
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      {/* Modal Content */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 border-4 border-yellow-500 p-8">
        
        <div className="text-center">
          {/* Spinner */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-4 border-yellow-500 border-t-transparent shadow-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
                ⚔️
              </div>
            </div>
          </div>
          
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
            Finding Worthy Opponent...
          </h2>
          <p className="text-gray-400 font-semibold mb-8">
            Searching for another brave soul to accept your challenge
          </p>
          
          {/* Duel Info */}
          <div className="bg-gray-800 rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-semibold">Tier:</span>
              <span className="font-black text-white text-xl">
                {duelInfo.tier.icon} {duelInfo.tier.name} DUEL
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-semibold">Your Entry:</span>
              <span className="font-black text-red-400 text-xl">{duelInfo.tier.entryFee} MNT Locked</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-semibold">Prize Pool:</span>
              <span className="font-black text-green-400 text-xl">
                {(parseFloat(duelInfo.tier.entryFee) * 2).toFixed(1)} MNT Total
              </span>
            </div>
            
            <div className="border-t-2 border-gray-700 pt-4 flex items-center justify-between">
              <span className="text-gray-300 font-semibold">Time Waiting:</span>
              <span className="font-black text-blue-400 text-xl">{formatTime(timeWaiting)}</span>
            </div>
          </div>
          
          {/* Animation of swords clashing */}
          <div className="mb-6 text-6xl animate-pulse">
            ⚔️ 🛡️ ⚔️
          </div>
          
          {/* Cancel Button */}
          {canCancel ? (
            <button
              onClick={handleCancel}
              disabled={isCanceling}
              className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-8 rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCanceling ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  CANCELING...
                </span>
              ) : (
                '❌ Cancel & Get Refund'
              )}
            </button>
          ) : (
            <div className="bg-gray-700 text-gray-400 font-semibold py-4 px-8 rounded-xl">
              ⏳ Cancel available in {formatTime(300 - timeWaiting)}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-6">
            💡 Tip: Share this duel link with friends for faster matchmaking!
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Duel ID: #{duelInfo.duelId}
          </p>
        </div>
      </div>
    </div>
  );
}
