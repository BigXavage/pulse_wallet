// client/src/pages/WalletDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import BalanceSection from '../components/BalanceSection';
import TokenList from '../components/TokenList';
import StakingAd from '../components/StakingAd';
import ReferralSection from '../components/ReferralSection';
import { CORE_RPC_URL, CORE_SCAN_API, COINGECKO_API, TOKEN_ADDRESSES, PULSE_CONTRACT_ADDRESS, PULSE_ABI, ERC20_ABI, API_URL } from '../config';

const WalletDashboard = () => {
  const [wallet, setWallet] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [coreBalance, setCoreBalance] = useState('0');
  const [pulseBalance, setPulseBalance] = useState('0');
  const [totalBalanceUSD, setTotalBalanceUSD] = useState('0.00');
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
    let selectedAddress = localStorage.getItem('selectedWallet') || '';
    
    const selectedWallet = storedWallets.find((w) => w.address.toLowerCase() === selectedAddress.toLowerCase());
    if (!selectedWallet && storedWallets.length > 0) {
      selectedAddress = storedWallets[0].address;
      localStorage.setItem('selectedWallet', selectedAddress);
    }

    if (selectedWallet || storedWallets.length > 0) {
      const walletData = {
        address: selectedAddress ? (selectedWallet || storedWallets[0]).address : storedWallets[0].address,
        privateKey: (selectedWallet || storedWallets[0]).privateKey,
        mnemonic: (selectedWallet || storedWallets[0]).mnemonic,
      };
      setWallet(walletData);
      setWallets(storedWallets);
      localStorage.setItem('selectedWallet', walletData.address);
      fetchData(walletData);
    } else {
      setLoading(false);
      toast.warn('No wallet found, redirecting to import');
      navigate('/import', { replace: true });
    }
  }, [navigate, location.state?.refreshBalances]);

  const fetchData = async (selectedWallet) => {
    setLoading(true);
    try {
      console.log('Fetching data for wallet:', selectedWallet.address);
      const provider = new ethers.JsonRpcProvider(CORE_RPC_URL);

      // Fetch CORE balance
      const coreBalanceWei = await provider.getBalance(selectedWallet.address);
      const coreBalanceEth = ethers.formatEther(coreBalanceWei);
      setCoreBalance(parseFloat(coreBalanceEth).toFixed(4));

      // Fetch PULSE balance
      let pulseBalanceEth = '0';
      try {
        let attempts = 3;
        while (attempts > 0) {
          try {
            const pulseResponse = await axios.get(
              `${CORE_SCAN_API}?module=account&action=tokenbalance&contractaddress=${PULSE_CONTRACT_ADDRESS}&address=${selectedWallet.address}`,
              { timeout: 5000 }
            );
            if (pulseResponse.data.status !== '1') {
              throw new Error('Failed to fetch PULSE balance');
            }
            const pulseBalanceWei = BigInt(pulseResponse.data.result);
            pulseBalanceEth = parseFloat(pulseBalanceWei) / 1e18;
            setPulseBalance(pulseBalanceEth.toFixed(4));
            break;
          } catch (error) {
            attempts--;
            if (attempts === 0) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error('Error fetching PULSE balance:', error);
        toast.error('Failed to load PULSE balance');
      }

      // Fetch token balances
      const tokenBalances = await Promise.all(
        Object.entries(TOKEN_ADDRESSES)
          .filter(([name]) => name !== 'CORE')
          .map(async ([name, address]) => {
            let attempts = 3;
            while (attempts > 0) {
              try {
                const response = await axios.get(
                  `${CORE_SCAN_API}?module=account&action=tokenbalance&contractaddress=${address}&address=${selectedWallet.address}`,
                  { timeout: 5000 }
                );
                if (response.data.status !== '1') {
                  throw new Error(`Failed to fetch ${name} balance`);
                }
                const balanceWei = BigInt(response.data.result);
                const decimals = name === 'USDT' ? 6 : 18;
                const balance = parseFloat(balanceWei) / 10 ** decimals;
                return { name, address, balance: balance.toFixed(4) };
              } catch (error) {
                attempts--;
                if (attempts === 0) {
                  console.error(`Error fetching ${name} balance:`, error);
                  return { name, address, balance: '0.0000' };
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          })
      );

      // Fetch USD prices
      let corePrice = 0.8;
      let wcorePrice = 0.8;
      let usdtPrice = 1.0;
      try {
        const response = await axios.get(
          `${COINGECKO_API}/simple/price?ids=core,wrapped-core,tether&vs_currencies=usd`
        );
        const prices = response.data;
        corePrice = prices.core?.usd || corePrice;
        wcorePrice = prices['wrapped-core']?.usd || wcorePrice;
        usdtPrice = prices.tether?.usd || usdtPrice;
      } catch (error) {
        console.error('Error fetching prices:', error);
        toast.warn('Using contract prices due to API failure');
      }

      // Calculate total USD balance
      const coreUSD = parseFloat(coreBalanceEth) * corePrice;
      const pulseUSD = 0;
      const tokenUSD = tokenBalances.reduce((sum, token) => {
        const price = token.name === 'WCORE' ? wcorePrice : usdtPrice;
        return sum + parseFloat(token.balance) * price;
      }, 0);
      setTotalBalanceUSD((coreUSD + pulseUSD + tokenUSD).toFixed(2));
      setTokens(tokenBalances);

      // Fetch transaction count
      let attempts = 3;
      while (attempts > 0) {
        try {
          const txResponse = await axios.get(
            `${CORE_SCAN_API}?module=account&action=txlist&address=${selectedWallet.address}`,
            { timeout: 5000 }
          );
          if (txResponse.data.status !== '1') {
            throw new Error('Failed to fetch transaction count');
          }
          const txCount = txResponse.data.result.length;
          setTransactions(txCount);
          break;
        } catch (error) {
          attempts--;
          if (attempts === 0) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
    setLoading(false);
  };

  const selectWallet = (address) => {
    const selectedWallet = wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
    if (selectedWallet) {
      setWallet({
        address: selectedWallet.address,
        privateKey: selectedWallet.privateKey,
        mnemonic: selectedWallet.mnemonic,
      });
      localStorage.setItem('selectedWallet', address);
      fetchData(selectedWallet);
    } else {
      setWallet(null);
      localStorage.removeItem('selectedWallet');
      navigate('/import', { replace: true });
    }
  };

  const handleAddWallet = async () => {
    try {
      const { value } = await toast.promise(
        new Promise((resolve) => {
          const input = prompt('Enter private key or mnemonic:');
          resolve(input);
        }),
        {
          pending: 'Waiting for input...',
          success: 'Processing wallet...',
          error: 'Failed to add wallet',
        }
      );
      if (!value) return;

      let newWallet;
      if (value.split(' ').length > 1) {
        newWallet = ethers.Wallet.fromPhrase(value.trim());
      } else {
        const key = value.startsWith('0x') ? value : '0x' + value;
        newWallet = new ethers.Wallet(key);
      }

      const payload = {
        address: newWallet.address,
        [value.split(' ').length > 1 ? 'mnemonic' : 'privateKey']: value,
      };
      const response = await axios.post(`${API_URL}/wallet/import`, payload);
      if (response.status !== 200) {
        throw new Error(response.data.message || 'Backend failed to store wallet');
      }

      const storedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
      const updatedWallets = [
        ...storedWallets.filter((w) => w.address.toLowerCase() !== newWallet.address.toLowerCase()),
        {
          address: newWallet.address,
          privateKey: payload.privateKey,
          mnemonic: payload.mnemonic,
        },
      ];
      localStorage.setItem('wallets', JSON.stringify(updatedWallets));
      localStorage.setItem('selectedWallet', newWallet.address);
      setWallets(updatedWallets);
      setWallet({
        address: newWallet.address,
        privateKey: payload.privateKey,
        mnemonic: payload.mnemonic,
      });
      fetchData({
        address: newWallet.address,
        privateKey: payload.privateKey,
        mnemonic: payload.mnemonic,
      });
      toast.success('Wallet added successfully!');
    } catch (error) {
      console.error('Error adding wallet:', error);
      toast.error(error.message || 'Failed to add wallet');
    }
  };

  const handleDeleteWallet = async (addressToDelete) => {
    const walletToDelete = wallets.find((w) => w.address.toLowerCase() === addressToDelete.toLowerCase());
    if (!walletToDelete) return;

    const warning = `WARNING: Deleting wallet ${addressToDelete.slice(0, 6)}...${addressToDelete.slice(-4)}. Please save your private key or mnemonic before continuing, as it will be permanently removed:\n\n${
      walletToDelete.privateKey || walletToDelete.mnemonic
    }\n\nType "DELETE" to confirm.`;
    const confirmation = prompt(warning);
    if (confirmation !== 'DELETE') {
      toast.error('Wallet deletion cancelled');
      return;
    }

    try {
      await axios.delete(`${API_URL}/wallet/delete/${addressToDelete}`);
      const storedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
      const updatedWallets = storedWallets.filter((w) => w.address.toLowerCase() !== addressToDelete.toLowerCase());
      localStorage.setItem('wallets', JSON.stringify(updatedWallets));
      setWallets(updatedWallets);

      if (wallet?.address.toLowerCase() === addressToDelete.toLowerCase()) {
        const newSelectedWallet = updatedWallets[0]?.address || '';
        localStorage.setItem('selectedWallet', newSelectedWallet);
        if (updatedWallets[0]) {
          setWallet({
            address: updatedWallets[0].address,
            privateKey: updatedWallets[0].privateKey,
            mnemonic: updatedWallets[0].mnemonic,
          });
          fetchData(updatedWallets[0]);
        } else {
          setWallet(null);
          navigate('/import', { replace: true });
        }
      }
      
      toast.success('Wallet deleted successfully!');
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error(error.message || 'Failed to delete wallet');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-primary p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-accent text-3xl font-bold">PulseWallet Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            className="p-2 bg-text text-primary rounded-md"
            value={wallet?.address || ''}
            onChange={(e) => selectWallet(e.target.value)}
          >
            <option value="">Select Wallet</option>
            {wallets.map((w) => (
              <option key={w.address} value={w.address}>
                {w.address.slice(0, 6)}...{w.address.slice(-4)}
              </option>
            ))}
          </select>
          <button onClick={handleAddWallet} className="bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark">
            Add Wallet
          </button>
          {wallet && (
            <button
              onClick={() => handleDeleteWallet(wallet.address)}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Delete Wallet
            </button>
          )}
        </div>
      </header>
      {wallet ? (
        <>
          <BalanceSection
            coreBalance={coreBalance}
            pulseBalance={pulseBalance}
            wallet={wallet}
            transactions={transactions}
            totalBalanceUSD={totalBalanceUSD}
          />
          <div className="flex flex-col md:flex-row gap-5">
            <div className="md:w-1/2">
              <TokenList wallet={wallet} />
            </div>
            <div className="md:w-1/2">
              <StakingAd wallet={wallet} />
            </div>
          </div>
          <ReferralSection address={wallet.address} pulseBalance={pulseBalance} />
        </>
      ) : (
        <p className="text-text text-center">No wallet selected. Please import or select a wallet.</p>
      )}
    </div>
  );
};

export default WalletDashboard;