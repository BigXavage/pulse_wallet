 // client/src/components/BalanceSection.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { toast } from 'react-toastify';
import QRCode from 'qrcode.react';
import { CORE_SCAN_API, PULSE_CONTRACT_ADDRESS, PULSE_ABI, API_URL } from '../config';

const BalanceSection = ({ coreBalance, pulseBalance, wallet, transactions, totalBalanceUSD }) => {
  const [isClaimed, setIsClaimed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [claimableAmount, setClaimableAmount] = useState('0');

  useEffect(() => {
    const checkClaimStatus = async () => {
      try {
        // Fetch hasClaimed
        const hasClaimedData = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [wallet.address]);
        const hasClaimedResponse = await axios.get(
          `${CORE_SCAN_API}?module=proxy&action=eth_call&to=${PULSE_CONTRACT_ADDRESS}&data=0xe12f3a61${hasClaimedData.slice(2)}`,
          { timeout: 5000 }
        );
        if (hasClaimedResponse.data.status !== '1' || hasClaimedResponse.data.result === '0x') {
          throw new Error('Failed to fetch claim status');
        }
        const claimed = ethers.AbiCoder.defaultAbiCoder().decode(['bool'], hasClaimedResponse.data.result)[0];
        setIsClaimed(claimed);

        if (!claimed) {
          // Try getClaimableAmount
          const claimableData = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [wallet.address]);
          const claimableResponse = await axios.get(
            `${CORE_SCAN_API}?module=proxy&action=eth_call&to=${PULSE_CONTRACT_ADDRESS}&data=0x0cb3a488${claimableData.slice(2)}`,
            { timeout: 5000 }
          );
          if (claimableResponse.data.status === '1' && claimableResponse.data.result !== '0x') {
            const amount = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], claimableResponse.data.result)[0];
            setClaimableAmount(ethers.formatEther(amount));
          } else {
            setClaimableAmount('100'); // Default for eligibility
          }
        }
      } catch (error) {
        console.error('Error checking claim status:', error);
        // Fallback: Assume eligible if no transactions
        setIsClaimed(false);
        setClaimableAmount('100');
        toast.warn('Unable to verify claim status, but you may be eligible to claim');
      }
    };
    checkClaimStatus();
  }, [wallet.address]);

  const handleClaim = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (parseFloat(claimableAmount) === 0) {
        throw new Error('No tokens to claim');
      }
      const provider = new ethers.JsonRpcProvider('https://rpc.coredao.org');
      const signer = new ethers.Wallet(wallet.privateKey, provider);
      const contract = new ethers.Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, signer);

      let response;
      let attempts = 3;
      while (attempts > 0) {
        try {
          response = await axios.post(`${API_URL}/wallet/sign-claim`, {
            address: wallet.address,
          });
          break;
        } catch (error) {
          attempts--;
          if (attempts === 0) throw new Error('Failed to reach backend after retries');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (response.status !== 200) {
        throw new Error(response.data.message || 'Failed to claim tokens');
      }
      const { adminSig, nonce, amount, messageHash } = response.data;

      const userSig = await signer.signMessage(ethers.getBytes(messageHash));

      const feeData = await provider.getFeeData();
      const gasLimit = await contract.claimTokens.estimateGas(
        wallet.address,
        amount,
        ethers.ZeroAddress,
        nonce,
        adminSig,
        userSig
      );
      const tx = await contract.claimTokens(
        wallet.address,
        amount,
        ethers.ZeroAddress,
        nonce,
        adminSig,
        userSig,
        {
          gasLimit: gasLimit * 120n / 100n,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      );
      const receipt = await tx.wait();
      setIsClaimed(true);
      setClaimableAmount('0');
      toast.success(`Claimed ${ethers.formatEther(amount)} PULSE! Hash: ${receipt.transactionHash}`);
    } catch (error) {
      console.error('Claim error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to claim tokens';
      toast.error(errorMessage);
    }
    setIsLoading(false);
  };

  const handleSend = async () => {
    setShowSendModal(true);
  };

  const handleSendSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (!ethers.isAddress(sendAddress)) {
        throw new Error('Invalid address');
      }
      const amountWei = ethers.parseEther(sendAmount);
      const provider = new ethers.JsonRpcProvider('https://rpc.coredao.org');
      const signer = new ethers.Wallet(wallet.privateKey, provider);
      const balanceWei = await provider.getBalance(wallet.address);
      if (balanceWei < amountWei) {
        throw new Error('Insufficient CORE balance');
      }
      const feeData = await provider.getFeeData();
      const gasLimit = 21000n;
      const tx = await signer.sendTransaction({
        to: sendAddress,
        value: amountWei,
        gasLimit,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });
      const receipt = await tx.wait();
      toast.success(`Sent ${sendAmount} CORE! Hash: ${receipt.transactionHash}`);
      setShowSendModal(false);
      setSendAddress('');
      setSendAmount('');
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error.message || 'Failed to send CORE');
    }
    setIsLoading(false);
  };

  const handleReceive = () => {
    setShowReceiveModal(true);
  };

  const copyAddress = () => {
    navigator.clipboard.write(wallet.address);
    toast.success('Address copied to clipboard!');
  };

  return (
    <div className="bg-secondary p-6 rounded-lg shadow-lg mb-8 w-full relative z-10">
      <h2 className="text-accent text-2xl font-bold mb-4">Wallet Balance</h2>
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div>
          <p className="text-text text-lg">Total Balance: <span className="text-accent">${totalBalanceUSD}</span></p>
          <p className="text-text">CORE: {coreBalance}</p>
          <p className="text-text">PULSE: {pulseBalance}</p>
          {!isClaimed && parseFloat(claimableAmount) > 0 && (
            <p className="text-text">Claimable: {claimableAmount} PULSE</p>
          )}
        </div>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <button
            onClick={handleSend}
            className="bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark"
          >
            Send
          </button>
          <button
            onClick={handleReceive}
            className="bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark"
          >
            Receive
          </button>
          {!isClaimed && parseFloat(claimableAmount) > 0 && (
            <button
              onClick={handleClaim}
              className={`bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Claiming...' : 'Claim PulseToken'}
            </button>
          )}
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-secondary p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-accent text-xl font-bold mb-4">Send CORE</h3>
            <div className="mb-4">
              <label className="block text-text mb-2">Recipient Address</label>
              <input
                type="text"
                className="w-full p-2.5 bg-text text-primary rounded-md"
                value={sendAddress}
                onChange={(e) => setSendAddress(e.target.value)}
                placeholder="Enter recipient address"
                disabled={isLoading}
              />
            </div>
            <div className="mb-4">
              <label className="block text-text mb-2">Amount (CORE)</label>
              <input
                type="number"
                className="w-full p-2.5 bg-text text-primary rounded-md"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.0001"
                disabled={isLoading}
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSendSubmit}
                className={`bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark ${
                  isLoading || !sendAddress || !sendAmount ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading || !sendAddress || !sendAmount}
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={() => setShowSendModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-secondary p-6 rounded-lg shadow-lg text-center w-full max-w-md">
            <h3 className="text-accent text-xl font-bold mb-4">Receive CORE</h3>
            <div className="bg-white p-4 rounded-md inline-block">
              <QRCode value={wallet.address} size={200} />
            </div>
            <p className="text-text mt-4 mb-2">Wallet Address:</p>
            <p
              className="text-text font-mono break-all cursor-pointer hover:text-accent"
              onClick={copyAddress}
            >
              {wallet.address}
            </p>
            <button
              onClick={() => setShowReceiveModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSection;