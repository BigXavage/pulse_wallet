import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CORE_SCAN_API, PULSE_CONTRACT_ADDRESS, PULSE_ABI, TOKEN_ADDRESSES, API_URL } from '../config';

const StakingSection = ({ wallet }) => {
  const [coreStaked, setCoreStaked] = useState('0.0000');
  const [usdtStaked, setUsdtStaked] = useState('0.0000');
  const [coreRewards, setCoreRewards] = useState('0.0000');
  const [usdtRewards, setUsdtRewards] = useState('0.0000');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeToken, setStakeToken] = useState('CORE');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStakes = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(CORE_SCAN_API);
        const contract = new ethers.Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, provider);

        const coreStakedWei = await contract.getStake(wallet.address, TOKEN_ADDRESSES.CORE);
        const usdtStakedWei = await contract.getStake(wallet.address, TOKEN_ADDRESSES.USDT);
        const coreRewardsWei = await contract.getStakingRewards(wallet.address, TOKEN_ADDRESSES.CORE);
        const usdtRewardsWei = await contract.getStakingRewards(wallet.address, TOKEN_ADDRESSES.USDT);

        setCoreStaked(ethers.formatEther(coreStakedWei));
        setUsdtStaked(ethers.formatUnits(usdtStakedWei, 6));
        setCoreRewards(ethers.formatEther(coreRewardsWei));
        setUsdtRewards(ethers.formatUnits(usdtRewardsWei, 6));
      } catch (error) {
        console.error('Error fetching stakes:', error);
        toast.error('Failed to load staking data');
      }
    };

    fetchStakes();
  }, [wallet.address]);

  const handleStake = async () => {
    if (isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0) return;
    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(CORE_RPC_URL);
      const signer = new ethers.Wallet(wallet.privateKey, provider);
      const contract = new ethers.Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, signer);

      const feeData = await provider.getFeeData();
      let tx;
      if (stakeToken === 'CORE') {
        tx = await contract.stakeCore({
          value: ethers.parseEther(stakeAmount),
          gasLimit: 200000,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        });
      } else {
        const tokenContract = new ethers.Contract(TOKEN_ADDRESSES.USDT, PULSE_ABI, signer);
        await tokenContract.approve(PULSE_CONTRACT_ADDRESS, ethers.parseUnits(stakeAmount, 6));
        tx = await contract.stakeUsdt(ethers.parseUnits(stakeAmount, 6), {
          gasLimit: 200000,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        });
      }
      const receipt = await tx.wait();
      toast.success(`Staked ${stakeAmount} ${stakeToken}! Hash: ${receipt.transactionHash}`);
      setStakeAmount('');

      const coreStakedWei = await contract.getStake(wallet.address, TOKEN_ADDRESSES.CORE);
      const usdtStakedWei = await contract.getStake(wallet.address, TOKEN_ADDRESSES.USDT);
      const coreRewardsWei = await contract.getStakingRewards(wallet.address, TOKEN_ADDRESSES.CORE);
      const usdtRewardsWei = await contract.getStakingRewards(wallet.address, TOKEN_ADDRESSES.USDT);
      setCoreStaked(ethers.formatEther(coreStakedWei));
      setUsdtStaked(ethers.formatUnits(usdtStakedWei, 6));
      setCoreRewards(ethers.formatEther(coreRewardsWei));
      setUsdtRewards(ethers.formatUnits(usdtRewardsWei, 6));
    } catch (error) {
      console.error('Stake error:', error);
      toast.error(error.reason || error.message || 'Failed to stake');
    }
    setIsLoading(false);
  };

  const handleClaimRewards = async (token) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(CORE_RPC_URL);
      const signer = new ethers.Wallet(wallet.privateKey, provider);
      const contract = new ethers.Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, signer);

      const tokenAddress = token === 'CORE' ? TOKEN_ADDRESSES.CORE : TOKEN_ADDRESSES.USDT;
      const feeData = await provider.getFeeData();
      const tx = await contract.claimRewards(tokenAddress, {
        gasLimit: 200000,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });
      const receipt = await tx.wait();
      toast.success(`Claimed ${token} rewards! Hash: ${receipt.transactionHash}`);

      const coreStakedWei = await contract.getStake(wallet.address, TOKEN_ADDRESSES.CORE);
      const usdtStakedWei = await contract.getStake(wallet.address, TOKEN_ADDRESSES.USDT);
      const coreRewardsWei = await contract.getStakingRewards(wallet.address, TOKEN_ADDRESSES.CORE);
      const usdtRewardsWei = await contract.getStakingRewards(wallet.address, TOKEN_ADDRESSES.USDT);
      setCoreStaked(ethers.formatEther(coreStakedWei));
      setUsdtStaked(ethers.formatUnits(usdtStakedWei, 6));
      setCoreRewards(ethers.formatEther(coreRewardsWei));
      setUsdtRewards(ethers.formatUnits(usdtRewardsWei, 6));
    } catch (error) {
      console.error('Reward claim error:', error);
      toast.error(error.reason || error.message || 'Failed to claim rewards');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-secondary p-6 rounded-lg shadow-lg">
      <h2 className="text-accent text-xl font-bold mb-4">Staking</h2>
      <div className="text-text mb-4">
        <p>Staked CORE: {coreStaked} CORE</p>
        <p>Staked USDT: {usdtStaked} USDT</p>
        <p>CORE Rewards: {coreRewards} CORE</p>
        <p>USDT Rewards: {usdtRewards} USDT</p>
      </div>
      <div className="flex items-center space-x-4 mb-4">
        <select
          className="p-2 bg-text text-primary rounded-md"
          value={stakeToken}
          onChange={(e) => setStakeToken(e.target.value)}
          disabled={isLoading}
        >
          <option value="CORE">CORE</option>
          <option value="USDT">USDT</option>
        </select>
        <input
          type="text"
          className="w-full p-2.5 bg-text text-primary rounded-md"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          placeholder="Enter amount to stake"
          disabled={isLoading}
        />
        <button
          onClick={handleStake}
          className={`bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark ${
            isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
        >
          {isLoading ? 'Staking...' : 'Stake'}
        </button>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={() => handleClaimRewards('CORE')}
          className={`bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark ${
            isLoading || parseFloat(coreRewards) === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading || parseFloat(coreRewards) === 0}
        >
          {isLoading ? 'Claiming...' : 'Claim CORE Rewards'}
        </button>
        <button
          onClick={() => handleClaimRewards('USDT')}
          className={`bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark ${
            isLoading || parseFloat(usdtRewards) === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading || parseFloat(usdtRewards) === 0}
        >
          {isLoading ? 'Claiming...' : 'Claim USDT Rewards'}
        </button>
      </div>
    </div>
  );
};

export default StakingSection;