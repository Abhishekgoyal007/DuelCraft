// Contract addresses for deployed contracts
// Update these after deploying to Mantle

export const CONTRACTS = {
  // Mantle Testnet (Chain ID: 5003) - Character Rarity System Active ✅
  mantleTestnet: {
    chainId: 5003,
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    blockExplorer: 'https://explorer.sepolia.mantle.xyz',
    contracts: {
      ArenaToken: '0x57AC8904F597E727BD53e8E9f7A00280876F13A1',
      DuelCraftCharacter: '0x5f8B9575ABADF3A356337c2118045412A966BED9',
      SeasonPass: '0x7385035e4436Cc987298497555094e2d4B9b89b0',
      Marketplace: '0x9edAE91e4d9Fe8B89238223CcEd674D321C0d8f7',
      Tournament: '0xcFC6599Cb85058566261d303FDD9a7f50438D2DD',
    },
  },
  
  // Mantle Mainnet (Chain ID: 5000)
  mantleMainnet: {
    chainId: 5000,
    rpcUrl: 'https://rpc.mantle.xyz',
    blockExplorer: 'https://explorer.mantle.xyz',
    contracts: {
      ArenaToken: '0x0000000000000000000000000000000000000000',
      DuelCraftCharacter: '0x0000000000000000000000000000000000000000',
      SeasonPass: '0x0000000000000000000000000000000000000000',
      Marketplace: '0x0000000000000000000000000000000000000000',
      Tournament: '0x0000000000000000000000000000000000000000',
    },
  },
};

// Default network (use testnet for development)
export const DEFAULT_NETWORK = 'mantleTestnet';

// Get contract addresses for current network
export function getContractAddresses(chainId) {
  if (chainId === 5003) return CONTRACTS.mantleTestnet.contracts;
  if (chainId === 5000) return CONTRACTS.mantleMainnet.contracts;
  return CONTRACTS.mantleTestnet.contracts; // Default to testnet
}

// Get network config
export function getNetworkConfig(chainId) {
  if (chainId === 5003) return CONTRACTS.mantleTestnet;
  if (chainId === 5000) return CONTRACTS.mantleMainnet;
  return CONTRACTS.mantleTestnet;
}

// Network names
export const NETWORK_NAMES = {
  5003: 'Mantle Testnet',
  5000: 'Mantle Mainnet',
};

// Check if correct network
export function isCorrectNetwork(chainId) {
  return chainId === 5003 || chainId === 5000;
}

// Switch network helper
export async function switchToMantleNetwork(testnet = true) {
  const targetChainId = testnet ? 5003 : 5000;
  const config = testnet ? CONTRACTS.mantleTestnet : CONTRACTS.mantleMainnet;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });
    return true;
  } catch (switchError) {
    // Chain not added, try adding it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: testnet ? 'Mantle Testnet' : 'Mantle',
            nativeCurrency: {
              name: 'MNT',
              symbol: 'MNT',
              decimals: 18,
            },
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: [config.blockExplorer],
          }],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        return false;
      }
    }
    console.error('Failed to switch network:', switchError);
    return false;
  }
}
