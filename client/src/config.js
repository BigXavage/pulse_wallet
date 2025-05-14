// client/src/config.js
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const CORE_RPC_URL = import.meta.env.VITE_CORE_RPC_URL || 'https://rpc.coredao.org';
export const CORE_SCAN_API = 'https://api.scan.coredao.org/api';
export const PULSE_CONTRACT_ADDRESS = import.meta.env.VITE_PULSE_CONTRACT_ADDRESS || '0x9d0714497318CDE8F285b51f1f896aE88e26a52F';
export const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || '0xD19Ce693E7a8f4cF9C3f8E206bA244C9a4239fAd';
export const COINGECKO_API = 'https://api.coingecko.com/api/v3';
export const TOKEN_ADDRESSES = {
  CORE: '0x0000000000000000000000000000000000000000',
  WCORE: '0x40375C92d9FAf44d2f9db9Bd9ba41a3317a2404f',
  USDT: '0xef3A930e1FfFFAcd2fc13434aC81bD278B0ecC8d',
  PULSE: '0x9d0714497318CDE8F285b51f1f896aE88e26a52F',
};

// PULSE_ABI (unchanged, matches PulseStaking.sol)
// ERC20_ABI (unchanged)

export const PULSE_ABI = [
  {
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "referrer", "type": "address" },
      { "name": "nonce", "type": "uint256" },
      { "name": "adminSig", "type": "bytes" },
      { "name": "userSig", "type": "bytes" }
    ],
    "name": "claimTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "count", "type": "uint256" },
      { "name": "nonce", "type": "uint256" },
      { "name": "adminSig", "type": "bytes" }
    ],
    "name": "setTransactionCount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stakeCore",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "amount", "type": "uint256" }
    ],
    "name": "stakeUsdt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "token", "type": "address" }
    ],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" }
    ],
    "name": "getClaimableAmount",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "token", "type": "address" }
    ],
    "name": "getStakingRewards",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "token", "type": "address" }
    ],
    "name": "getStake",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" }
    ],
    "name": "getReferralEarnings",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" }
    ],
    "name": "getReferredUsers",
    "outputs": [{ "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "account", "type": "address" }
    ],
    "name": "hasClaimed",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "from", "type": "address" },
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export const ERC20_ABI = [
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
];