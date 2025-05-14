// client/src/components/TokenList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { CORE_SCAN_API, COINGECKO_API, TOKEN_ADDRESSES, CORE_RPC_URL } from '../config';
import { toast } from 'react-toastify';

const TokenList = ({ wallet }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [showAddToken, setShowAddToken] = useState(false);
  const [tokenUpdateTrigger, setTokenUpdateTrigger] = useState(0);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);

        // Load custom tokens from localStorage
        const customTokens = JSON.parse(localStorage.getItem('customTokens') || '[]');

        // Define tokens to fetch (PULSE, CORE, WCORE, USDT, custom)
        const tokenList = [
          { name: 'PulseToken', symbol: 'PULSE', address: TOKEN_ADDRESSES.PULSE, decimals: 18 },
          { name: 'Core', symbol: 'CORE', address: TOKEN_ADDRESSES.CORE, decimals: 18 },
          { name: 'Wrapped Core', symbol: 'WCORE', address: TOKEN_ADDRESSES.WCORE, decimals: 18 },
          { name: 'Tether', symbol: 'USDT', address: TOKEN_ADDRESSES.USDT, decimals: 6 },
          ...customTokens.map((addr) => ({
            name: 'Custom Token',
            symbol: 'CUSTOM',
            address: addr,
            decimals: 18,
          })),
        ];

        // Fetch balances
        const provider = new ethers.JsonRpcProvider(CORE_RPC_URL);
        const tokenBalances = await Promise.all(
          tokenList.map(async (token) => {
            try {
              let balance;
              let name = token.name;
              let symbol = token.symbol;
              let decimals = token.decimals;

              if (token.address === TOKEN_ADDRESSES.CORE) {
                const balanceWei = await provider.getBalance(wallet.address);
                balance = parseFloat(ethers.formatEther(balanceWei));
              } else {
                let attempts = 3;
                while (attempts > 0) {
                  try {
                    const response = await axios.get(
                      `${CORE_SCAN_API}?module=account&action=tokenbalance&contractaddress=${token.address}&address=${wallet.address}`,
                      { timeout: 5000 }
                    );
                    if (response.data.status !== '1') {
                      throw new Error(`Failed to fetch ${token.symbol} balance`);
                    }
                    balance = parseFloat(response.data.result) / 10 ** decimals;
                    break;
                  } catch (error) {
                    attempts--;
                    if (attempts === 0) {
                      console.error(`Error fetching ${token.symbol} balance:`, error);
                      return {
                        name: token.name,
                        symbol: token.symbol,
                        address: token.address,
                        balance: '0.0000',
                        decimals: token.decimals,
                      };
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                  }
                }
                if (
                  token.address !== TOKEN_ADDRESSES.PULSE &&
                  token.address !== TOKEN_ADDRESSES.WCORE &&
                  token.address !== TOKEN_ADDRESSES.USDT
                ) {
                  // Custom token metadata
                  const contract = new ethers.Contract(
                    token.address,
                    [
                      'function name() view returns (string)',
                      'function symbol() view returns (string)',
                      'function decimals() view returns (uint8)',
                    ],
                    provider
                  );
                  name = await contract.name().catch(() => 'Custom Token');
                  symbol = await contract.symbol().catch(() => 'CUSTOM');
                  decimals = await contract.decimals().catch(() => 18);
                  balance = balance || 0; // Use fetched balance or 0
                }
              }
              return {
                name,
                symbol,
                address: token.address,
                balance: balance.toFixed(4),
                decimals,
              };
            } catch (error) {
              console.error(`Error fetching token ${token.symbol}:`, error);
              return {
                name: token.name,
                symbol: token.symbol,
                address: token.address,
                balance: '0.0000',
                decimals: token.decimals,
              };
            }
          })
        );

        // Include all tokens
        const validTokens = tokenBalances.filter((t) => t);

        // Fetch USD prices
        const tokenIds = validTokens
          .filter((t) => t.symbol !== 'PULSE' && t.symbol !== 'CUSTOM')
          .map((t) =>
            t.symbol.toLowerCase() === 'core'
              ? 'core'
              : t.symbol.toLowerCase() === 'wcore'
              ? 'wrapped-core'
              : 'tether'
          )
          .join(',');
        let prices = {
          core: { usd: 0.8 },
          'wrapped-core': { usd: 0.8 },
          tether: { usd: 1.0 },
        };
        try {
          const priceResponse = await axios.get(
            `${COINGECKO_API}/simple/price?ids=${tokenIds}&vs_currencies=usd`
          );
          prices = priceResponse.data;
        } catch (error) {
          console.error('Error fetching token prices:', error);
          toast.warn('Using default prices due to API failure');
        }

        const tokensWithPrices = validTokens.map((token) => ({
          ...token,
          usdPrice:
            token.symbol === 'PULSE' || token.symbol === 'CUSTOM'
              ? 0
              : prices[
                  token.symbol.toLowerCase() === 'core'
                    ? 'core'
                    : token.symbol.toLowerCase() === 'wcore'
                    ? 'wrapped-core'
                    : 'tether'
                ]?.usd || 0.8,
        }));

        setTokens(tokensWithPrices);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        toast.error('Failed to load token list');
      }
      setLoading(false);
    };
    fetchTokens();
  }, [wallet, tokenUpdateTrigger]);

  const handleAddToken = async () => {
    if (!customTokenAddress || !ethers.isAddress(customTokenAddress)) {
      toast.error('Please enter a valid token contract address');
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(CORE_RPC_URL);
      const contract = new ethers.Contract(
        customTokenAddress,
        [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
        ],
        provider
      );
      const name = await contract.name().catch(() => 'Custom Token');
      const symbol = await contract.symbol().catch(() => 'CUSTOM');
      const decimals = await contract.decimals().catch(() => 18);

      const customTokens = JSON.parse(localStorage.getItem('customTokens') || '[]');
      if (!customTokens.includes(customTokenAddress)) {
        customTokens.push(customTokenAddress);
        localStorage.setItem('customTokens', JSON.stringify(customTokens));
        toast.success(`Added ${name} (${symbol}) to token list`);
        setCustomTokenAddress('');
        setShowAddToken(false);
        setTokenUpdateTrigger((prev) => prev + 1);
      } else {
        toast.warn('Token already added');
      }
    } catch (error) {
      console.error('Error adding token:', error);
      toast.error('Failed to add token');
    }
  };

  if (loading) {
    return <div className="text-text">Loading tokens...</div>;
  }

  return (
    <div className="bg-secondary p-6 rounded-lg shadow-lg mt-4 relative z-0">
      <h2 className="text-accent text-xl font-bold mb-4">Tokens</h2>
      {tokens.length === 0 ? (
        <p className="text-text">No tokens found.</p>
      ) : (
        <ul className="space-y-4">
          {tokens.map((token) => (
            <li key={token.address} className="flex justify-between text-text">
              <span>
                {token.name} ({token.symbol})
              </span>
              <span>
                {token.balance} (~${(token.balance * token.usdPrice).toFixed(2)})
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <button
          onClick={() => setShowAddToken(!showAddToken)}
          className="bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark"
        >
          {showAddToken ? 'Cancel' : 'Add Token'}
        </button>
        {showAddToken && (
          <div className="mt-2 flex items-center space-x-2">
            <input
              type="text"
              className="w-full p-2.5 bg-text text-primary rounded-md"
              value={customTokenAddress}
              onChange={(e) => setCustomTokenAddress(e.target.value)}
              placeholder="Enter token contract address"
            />
            <button
              onClick={handleAddToken}
              className="bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenList;