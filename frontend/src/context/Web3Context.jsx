import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import { getContractAddresses, switchToMantleNetwork, isCorrectNetwork } from '../config/contracts';

// Import ABIs
import DuelCraftCharacterABI from '../contracts/abis/DuelCraftCharacter.json';
import ArenaTokenABI from '../contracts/abis/ArenaToken.json';
import SeasonPassABI from '../contracts/abis/SeasonPass.json';
import MarketplaceABI from '../contracts/abis/Marketplace.json';
import TournamentABI from '../contracts/abis/Tournament.json';

const Web3Context = createContext();

// Custom hook to use Web3 context
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

// Web3 Provider Component
export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contracts, setContracts] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectChain, setIsCorrectChain] = useState(false);

  const initializeContracts = useCallback((signer, chainId) => {
    try {
      const addresses = getContractAddresses(chainId);
      
      // Initialize contract instances with ABIs
      const contractInstances = {
        character: new Contract(addresses.DuelCraftCharacter, DuelCraftCharacterABI, signer),
        arenaToken: new Contract(addresses.ArenaToken, ArenaTokenABI, signer),
        seasonPass: new Contract(addresses.SeasonPass, SeasonPassABI, signer),
        marketplace: new Contract(addresses.Marketplace, MarketplaceABI, signer),
        tournament: new Contract(addresses.Tournament, TournamentABI, signer),
      };

      setContracts(contractInstances);
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setContracts({});
    setIsConnected(false);
    setIsCorrectChain(false);
  }, []);

  const checkConnection = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        
        setProvider(provider);
        setSigner(signer);
        setAddress(address);
        setChainId(Number(network.chainId));
        setIsConnected(true);
        setIsCorrectChain(isCorrectNetwork(Number(network.chainId)));
        
        // Initialize contracts
        initializeContracts(signer, Number(network.chainId));
      }
    } catch (error) {
      console.error('Connection check failed:', error);
    }
  }, [initializeContracts]);

  // Initialize provider
  useEffect(() => {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);

      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          window.location.reload();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Check if already connected
      checkConnection();

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkConnection, disconnectWallet]);

  async function connect() {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return false;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setChainId(chainId);
      setIsConnected(true);
      
      const correctChain = isCorrectNetwork(chainId);
      setIsCorrectChain(correctChain);

      if (!correctChain) {
        // Prompt to switch network
        const switched = await switchToMantleNetwork(true);
        if (switched) {
          window.location.reload();
        }
        return false;
      }

      // Initialize contracts
      initializeContracts(signer, chainId);
      
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  // Helper function to mint character NFT
  const mintCharacter = async (characterType, avatarData) => {
    console.log('[Web3Context] mintCharacter called with:', { characterType, avatarData });
    
    if (!contracts.character || !signer) {
      console.error('[Web3Context] Missing contracts or signer:', { hasContract: !!contracts.character, hasSigner: !!signer });
      throw new Error('Contracts not initialized or wallet not connected');
    }

    try {
      // Convert avatar data to customization struct
      const customization = {
        body: avatarData.body || 0,
        hair: avatarData.hair || 0,
        hairColor: avatarData.hairColor || 0,
        eyes: avatarData.eyes || 0,
        mouth: avatarData.mouth || 0,
        tops: avatarData.tops || 0,
        topColor: avatarData.topColor || 0,
        bottoms: avatarData.bottoms || 0,
        bottomColor: avatarData.bottomColor || 0,
        shoes: avatarData.shoes || 0,
        accessory: avatarData.accessory || 0,
        background: avatarData.background || 0,
        effect: avatarData.effect || 0,
      };

      console.log('[Web3Context] Sending transaction with:', { characterType, customization });
      
      // Call mintCharacter on contract with characterType and customization
      const tx = await contracts.character.mintCharacter(characterType, customization);
      console.log('[Web3Context] Transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      console.log('[Web3Context] Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('[Web3Context] Transaction confirmed:', receipt);
      
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      console.error('[Web3Context] Mint failed:', error);
      console.error('[Web3Context] Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      });
      throw error;
    }
  };

  const value = {
    provider,
    signer,
    address,
    chainId,
    contracts,
    isConnected,
    isCorrectChain,
    connect,
    disconnect: disconnectWallet,
    switchToMantleNetwork,
    mintCharacter,
    parseEther,
    formatEther,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
