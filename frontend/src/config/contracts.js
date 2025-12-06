// Contract addresses for deployed contracts
// Update these after deploying to Mantle

export const CONTRACTS = {
  // Mantle Testnet (Chain ID: 5003)
  mantleTestnet: {
    chainId: 5003,
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    blockExplorer: 'https://explorer.sepolia.mantle.xyz',
    contracts: {
      ArenaToken: '0x0bdf5C856348aDaf2Ff6745ffD04EA141F0773A2',
      DuelCraftCharacter: '0x171613677f691aB6F6f7BCEABA3fBDd1b2A4D980',
      SeasonPass: '0x90535F69DB586Ff5871A991fd34773B0E5d2a424',
      Marketplace: '0x9121d93A2BCFDB88F67FACB4031Ff3Bf78B8d2aa',
      Tournament: '0x97B5107340a0E34625BCD533e0AF69231A18B338',
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
