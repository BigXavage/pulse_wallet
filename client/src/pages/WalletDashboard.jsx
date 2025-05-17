import React, { useState, useEffect } from 'react';
import {
  JsonRpcProvider,
  Wallet,
  Contract,
  getBytes,
  keccak256,
  parseEther,
  formatEther,
  formatUnits,
  solidityPacked,
} from 'ethers';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import BalanceSection from '../components/BalanceSection';
import TokenList from '../components/TokenList';
import StakingAd from '../components/StakingAd';
import ReferralSection from '../components/ReferralSection';
import {
  CORE_RPC_URL,
  COINGECKO_API,
  TOKEN_ADDRESSES,
  PULSE_CONTRACT_ADDRESS,
  PULSE_ABI,
} from '../config';

// The block for May 15, 2025 23:59:59 UTC, as discovered by you.
const CLAIM_END_BLOCK = 24683011;
const CLAIM_THRESHOLD = 10;

// UI classes based on original PulseWallet palette
const cardClass =
  'bg-primary/95 rounded-xl shadow-xl p-6 mb-6 border border-accent';
const btnClass =
  'inline-block px-6 py-2 rounded-lg font-bold text-lg transition bg-accent text-primary shadow-lg hover:bg-accent-dark hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed';
const sectionTitleClass =
  'flex items-center gap-2 text-2xl md:text-3xl font-extrabold text-accent mb-3 tracking-tight';
const labelClass = 'block text-text font-semibold text-sm mb-1';
const valueClass = 'text-2xl font-mono text-text';

const WalletDashboard = () => {
  const [wallet, setWallet] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [coreBalance, setCoreBalance] = useState('0');
  const [pulseBalance, setPulseBalance] = useState('0');
  const [totalBalanceUSD, setTotalBalanceUSD] = useState('0.00');
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState(0);
  const [claimableAmount, setClaimableAmount] = useState('0');
  const [loading, setLoading] = useState(true);

  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [claimSuccessData, setClaimSuccessData] = useState({
    amount: '',
    token: 'PULSE',
  });

  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimedInitial, setHasClaimedInitial] = useState(false);

  const [appTxCount, setAppTxCount] = useState(0);
  const [pulseAppEarnings, setPulseAppEarnings] = useState(0);

  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referrerInput, setReferrerInput] = useState('');
  const [referrerSaved, setReferrerSaved] = useState('');
  const [referralError, setReferralError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
    let selectedAddress = localStorage.getItem('selectedWallet') || '';
    const selectedWallet = storedWallets.find(
      (w) => w.address.toLowerCase() === selectedAddress.toLowerCase()
    );
    if (!selectedWallet && storedWallets.length > 0) {
      selectedAddress = storedWallets[0].address;
      localStorage.setItem('selectedWallet', selectedAddress);
    }

    if (selectedWallet || storedWallets.length > 0) {
      const walletData = {
        address: selectedAddress
          ? (selectedWallet || storedWallets[0]).address
          : storedWallets[0].address,
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
    // eslint-disable-next-line
  }, [navigate, location.state?.refreshBalances]);

  const fetchData = async (selectedWallet) => {
    setLoading(true);
    try {
      const provider = new JsonRpcProvider(CORE_RPC_URL);

      // CORE balance
      const coreBalanceWei = await provider.getBalance(selectedWallet.address);
      setCoreBalance(parseFloat(formatEther(coreBalanceWei)).toFixed(4));

      // PULSE balance (ERC-20)
      let pulseBalanceEth = '0';
      try {
        const pulseContract = new Contract(
          PULSE_CONTRACT_ADDRESS,
          [
            'function balanceOf(address) view returns (uint256)',
            'function decimals() view returns (uint8)',
          ],
          provider
        );
        const [bal, decimals] = await Promise.all([
          pulseContract.balanceOf(selectedWallet.address),
          pulseContract.decimals().catch(() => 18),
        ]);
        pulseBalanceEth = formatUnits(bal, decimals);
        setPulseBalance(Number(pulseBalanceEth).toFixed(4));
      } catch (error) {
        setPulseBalance('0.0000');
      }

      // ERC-20 token balances
      const tokenBalances = await Promise.all(
        Object.entries(TOKEN_ADDRESSES)
          .filter(([name]) => name !== 'CORE' && name !== 'PULSE')
          .map(async ([name, address]) => {
            let attempts = 3;
            while (attempts > 0) {
              try {
                const erc20Abi = [
                  'function balanceOf(address) view returns (uint256)',
                  'function decimals() view returns (uint8)',
                ];
                const contract = new Contract(address, erc20Abi, provider);
                const [bal, decimals] = await Promise.all([
                  contract.balanceOf(selectedWallet.address),
                  contract.decimals().catch(() => (name === 'USDT' ? 6 : 18)),
                ]);
                const balance = parseFloat(formatUnits(bal, decimals));
                return { name, address, balance: balance.toFixed(4) };
              } catch (error) {
                attempts--;
                if (attempts === 0) {
                  return { name, address, balance: '0.0000' };
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          })
      );

      // Price fetch (CoinGecko)
      let corePrice = 0.8;
      let wcorePrice = 0.8;
      let usdtPrice = 1.0;
      try {
        const response = await axios.get(
          `${COINGECKO_API}/simple/price?ids=coredaoorg,wrapped-core,tether&vs_currencies=usd`
        );
        const prices = response.data;
        corePrice = prices.coredaoorg?.usd || corePrice;
        wcorePrice = prices['wrapped-core']?.usd || wcorePrice;
        usdtPrice = prices.tether?.usd || usdtPrice;
      } catch (error) {}

      // USD balance
      const coreUSD = parseFloat(coreBalanceWei ? formatEther(coreBalanceWei) : '0') * corePrice;
      const pulseUSD = parseFloat(pulseBalanceEth) * corePrice;
      const tokenUSD = tokenBalances.reduce((sum, token) => {
        const price =
          token.name === 'WCORE'
            ? wcorePrice
            : token.name === 'USDT'
            ? usdtPrice
            : 0;
        return sum + parseFloat(token.balance) * price;
      }, 0);
      setTotalBalanceUSD((coreUSD + pulseUSD + tokenUSD).toFixed(2));
      setTokens(tokenBalances);

      // --- On-chain claim status ---
      const pulseContract = new Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, provider);
      const claimed = await pulseContract.hasClaimed(selectedWallet.address);
      setHasClaimedInitial(claimed);

      // --- Transaction count and claimable amount logic ---
      try {
        const txCount = await provider.getTransactionCount(selectedWallet.address, 'latest');
        setTransactions(txCount);
        setClaimableAmount((txCount * 1).toFixed(2)); // 1 PULSE per transaction
      } catch (chainError) {
        console.error('Failed to fetch transaction count from blockchain:', chainError);
        toast.error('Unable to fetch transaction count');
      }

      // PulseWallet app tx count (after initial claim)
      let joinTxKey = `pulse_join_tx_${selectedWallet.address}`;
      let appTxStart = parseInt(localStorage.getItem(joinTxKey) || '0', 10);
      if (appTxStart === 0 && claimed) {
        const currentTxCount = await provider.getTransactionCount(selectedWallet.address, 'latest');
        localStorage.setItem(joinTxKey, currentTxCount);
        appTxStart = currentTxCount;
      }
      if (claimed) {
        const currentTxCount = await provider.getTransactionCount(selectedWallet.address, 'latest');
        const appTx = Math.max(0, currentTxCount - appTxStart);
        setAppTxCount(appTx);
        setPulseAppEarnings(appTx);
      } else {
        setAppTxCount(0);
        setPulseAppEarnings(0);
      }
    } catch (error) {
      toast.error(error.reason || error.message || 'Failed to load dashboard data');
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (parseFloat(claimableAmount) === 0) {
      toast.warn('No claimable amount available');
      return;
    }
    if (!referrerSaved && !showReferralModal) {
      setShowReferralModal(true);
      return;
    }
    setIsClaiming(true);
    try {
      const provider = new JsonRpcProvider(CORE_RPC_URL);
      const signer = new Wallet(wallet.privateKey, provider);
      const contract = new Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, signer);

      const amountToClaim = parseEther(claimableAmount);
      const referrer = referrerSaved || '0x0000000000000000000000000000000000000000';
      const nonce = Date.now() + Math.floor(Math.random() * 10000);

      const packed = solidityPacked(
        ['address', 'uint256', 'address', 'uint256'],
        [wallet.address, amountToClaim, referrer, nonce]
      );
      const messageHash = keccak256(packed);

      const userSig = await signer.signMessage(getBytes(messageHash));

      const response = await axios.post(`http://localhost:3001/api/coredao/claim-signature`, {
        address: wallet.address,
        amount: amountToClaim.toString(),
        referrer,
        nonce,
      });
      const adminSig = response.data.signature;

      if (!adminSig) {
        toast.error('Failed to obtain admin signature');
        setIsClaiming(false);
        return;
      }

      const tx = await contract.claimTokens(
        wallet.address,
        amountToClaim,
        referrer,
        nonce,
        adminSig,
        userSig,
        { gasLimit: 200000 }
      );
      await tx.wait();
      setClaimSuccessData({ amount: claimableAmount, token: 'PULSE' });
      setShowClaimSuccess(true);
      toast.success('Tokens claimed successfully!');
      setClaimableAmount('0');
      const currentTxCount = await provider.getTransactionCount(wallet.address, 'latest');
      localStorage.setItem(`pulse_join_tx_${wallet.address}`, currentTxCount);
      setHasClaimedInitial(true);
      fetchData(wallet);
    } catch (error) {
      toast.error(error.reason || error.message || 'Failed to claim tokens');
    }
    setIsClaiming(false);
  };

  const handleReferralSubmit = () => {
    setReferralError('');
    if (!referrerInput) {
      setReferrerSaved('0x0000000000000000000000000000000000000000');
      setShowReferralModal(false);
      handleClaim();
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(referrerInput)) {
      setReferralError('Invalid wallet address.');
      return;
    }
    if (referrerInput.toLowerCase() === wallet.address.toLowerCase()) {
      setReferralError('You cannot refer yourself.');
      return;
    }
    setReferrerSaved(referrerInput);
    setShowReferralModal(false);
    handleClaim();
  };

  const showInitialClaimSection = !hasClaimedInitial;
  const showAppRewardsSection = hasClaimedInitial;

  const selectWallet = (address) => {
    const selectedWallet = wallets.find(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );
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

  const handleAddWallet = async () => {};
  const handleDeleteWallet = async (addressToDelete) => {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text bg-primary">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-accent mb-4"></div>
          <span className="text-lg font-semibold text-text">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary p-6 font-sans">
      {showClaimSuccess && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white/90 p-8 rounded-2xl shadow-2xl text-center min-w-[260px] max-w-xs border border-green-400">
            <div className="text-4xl font-extrabold text-green-800 mb-3 text-shadow-md">
              ✅ Claim Successful!
            </div>
            <div className="text-xl font-bold text-gray-900 mb-4 text-shadow-sm">
              You have claimed{' '}
              <span className="text-accent font-extrabold">
                {claimSuccessData.amount} {claimSuccessData.token}
              </span>{' '}
              rewards!
            </div>
            <button
              className={btnClass + " w-full mt-2"}
              onClick={() => setShowClaimSuccess(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showReferralModal && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white/90 p-6 rounded-xl shadow-2xl text-center min-w-[320px] max-w-xs border border-accent">
            <h3 className="text-3xl font-extrabold text-accent mb-4 text-shadow-md">
              Enter Referral Address
            </h3>
            <p className="mb-3 text-gray-900 text-base font-semibold text-shadow-sm">
              Enter a referrer wallet address (optional), or leave blank for no referral.
            </p>
            <input
              className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-accent font-medium text-gray-900"
              placeholder="0x..."
              value={referrerInput}
              onChange={e => setReferrerInput(e.target.value)}
            />
            {referralError && (
              <div className="text-red-700 font-bold mb-3 text-shadow-sm">{referralError}</div>
            )}
            <div className="flex space-x-2">
              <button
                onClick={handleReferralSubmit}
                className={btnClass + " w-1/2"}
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowReferralModal(false);
                  setReferralError('');
                }}
                className="bg-gray-300 text-gray-900 px-4 py-2 rounded-lg w-1/2 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-center mb-7">
        <h1 className="text-4xl md:text-5xl font-extrabold text-accent drop-shadow-lg mb-3 md:mb-0">
          PulseWallet Dashboard
        </h1>
        <div className="flex items-center space-x-4">
          <select
            className="p-2 bg-white border border-accent text-primary rounded-lg font-semibold shadow"
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
          <button
            onClick={handleAddWallet}
            className={btnClass + " px-3 py-2 !text-base !font-semibold"}
          >
            Add Wallet
          </button>
          {wallet && (
            <button
              onClick={() => handleDeleteWallet(wallet.address)}
              className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 font-semibold"
            >
              Delete Wallet
            </button>
          )}
        </div>
      </header>

      {wallet ? (
        <>
          <div className={cardClass + " flex flex-col md:flex-row md:items-end gap-4"}>
            <BalanceSection
              coreBalance={coreBalance}
              pulseBalance={pulseBalance}
              wallet={wallet}
              transactions={transactions}
              totalBalanceUSD={totalBalanceUSD}
            />
          </div>
          {showInitialClaimSection && (
            <div className={cardClass}>
              <div className={sectionTitleClass}><span>🎁</span> Initial Claimable Amount</div>
              <label className={labelClass}>Eligible Transactions:</label>
              <span className={valueClass}>{claimableAmount}</span>
              <span className="ml-2 text-accent font-bold">PULSE</span>
              {parseFloat(claimableAmount) === 0 && (
                <p className="text-red-500 text-sm mt-2 mb-2">No claimable tokens available. Make transactions to earn claimable tokens.</p>
              )}
              <button
                onClick={handleClaim}
                className={btnClass + " mt-4 w-full"}
                disabled={isClaiming || parseFloat(claimableAmount) === 0}
              >
                {isClaiming ? 'Claiming...' : 'Claim Tokens'}
              </button>
              <div className="mt-3 text-xs text-text">
                After claiming, you'll start earning 1 PULSE for every transaction made on PulseWallet.
              </div>
            </div>
          )}
          {showAppRewardsSection && (
            <div className={cardClass}>
              <div className={sectionTitleClass}><span>🔥</span> PulseWallet Rewards</div>
              <div className="mb-2 text-text text-base">
                <b>Earn 1 PULSE for every transaction</b> performed with your wallet on the Pulse app!
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div>
                  <div className={labelClass}>Claimable:</div>
                  <div className={valueClass}>{pulseAppEarnings}</div>
                  <span className="ml-2 text-accent font-bold">PULSE</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-text">
                Your reward balance resets after every claim.
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/2">
              <div className={cardClass}><TokenList wallet={wallet} /></div>
            </div>
            <div className="md:w-1/2">
              <div className={cardClass}><StakingAd wallet={wallet} /></div>
            </div>
          </div>
          <div className={cardClass + " mt-6"}>
            <ReferralSection address={wallet.address} />
          </div>
        </>
      ) : (
        <div className={cardClass + " text-center"}>
          <p className="text-text font-semibold text-lg">
            No wallet selected. Please import or select a wallet.
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;