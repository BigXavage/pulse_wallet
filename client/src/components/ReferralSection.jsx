import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { CORE_RPC_URL, PULSE_CONTRACT_ADDRESS, PULSE_ABI } from '../config';

const ReferralSection = ({ address }) => {
  const referralLink = `${window.location.origin}/?ref=${address}`;
  const [referralEarnings, setReferralEarnings] = useState('0.0000');
  const [referredUsers, setReferredUsers] = useState([]);
  const [showReferrals, setShowReferrals] = useState(false);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  const fetchReferralData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(CORE_RPC_URL);
      const contract = new ethers.Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, provider);
      const earnings = await contract.getReferralEarnings(address);
      const users = await contract.getReferredUsers(address);
      setReferralEarnings(ethers.formatEther(earnings));
      setReferredUsers(users);
      setShowReferrals(true);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
    }
  };

  return (
    <div className="bg-secondary p-6 rounded-lg shadow-lg mt-6">
      <h2 className="text-accent text-xl font-bold mb-4">Referral Earnings</h2>
      <p className="text-text mb-4">
        Invite friends to PulseWallet and earn 10% of their claimed PULSE tokens! <br />
        <span className="font-semibold">Your PULSE referral earnings: {referralEarnings}</span>
      </p>
      <div className="flex items-center space-x-4 mb-4">
        <input
          type="text"
          className="w-full p-2.5 bg-text text-primary rounded-md"
          value={referralLink}
          readOnly
        />
        <button
          onClick={copyReferralLink}
          className="bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark"
        >
          Copy Link
        </button>
      </div>
      <button
        onClick={fetchReferralData}
        className="w-full bg-accent text-primary px-4 py-2 rounded-md hover:bg-accent-dark"
      >
        View Referral Earnings
      </button>
      {showReferrals && (
        <div className="mt-4">
          <p className="text-text mb-2">Total Referral Earnings: {referralEarnings} PULSE</p>
          <p className="text-text mb-2">Referred Users:</p>
          <ul className="text-text">
            {referredUsers.length === 0 ? (
              <li>No referrals yet.</li>
            ) : (
              referredUsers.map((user, index) => (
                <li key={index}>{user.slice(0, 6)}...{user.slice(-4)}</li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ReferralSection;