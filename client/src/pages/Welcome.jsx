import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { ethers } from 'ethers';
import axios from 'axios';
import { API_URL } from '../config';
import { toast } from 'react-toastify';

const Welcome = () => {
  const navigate = useNavigate();
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // CREATE WALLET
  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      const generatedMnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
      setMnemonic(generatedMnemonic);
      setShowMnemonic(true);
    } catch (err) {
      toast.error('Failed to generate wallet. Please try again.');
    }
    setIsCreating(false);
  };

  // SAVE AND LOGIN WITH NEW WALLET
  const handleSaveAndLogin = async () => {
    setIsSaving(true);
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      try {
        await axios.post(`${API_URL}/wallet/import`, {
          address: wallet.address,
          mnemonic,
          created: true,
        });
      } catch (err) {
        toast.warn('Could not save to server, wallet saved locally');
      }
      const storedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
      const newWallet = { address: wallet.address, mnemonic };
      const updatedWallets = [
        ...storedWallets.filter(w => w.address.toLowerCase() !== wallet.address.toLowerCase()),
        newWallet
      ];
      localStorage.setItem('wallets', JSON.stringify(updatedWallets));
      localStorage.setItem('selectedWallet', wallet.address);
      toast.success('Wallet created and imported successfully!');
      navigate('/dashboard', { replace: true, state: { refreshBalances: true } });
    } catch (err) {
      toast.error('Error saving wallet. Try again.');
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary">
      <div className="bg-primary shadow-xl rounded-2xl p-8 max-w-lg w-full flex flex-col items-center">
        <img
          src={logo}
          alt="Pulse Wallet Logo"
          className="w-20 h-20 mb-4"
        />
        <h1 className="text-accent text-3xl font-bold mb-3 text-center">
          Welcome to Pulse Wallet
        </h1>
        <p className="text-text text-lg mb-6 text-center">
          <span className="font-semibold">Pulse Wallet</span> is your secure and user-friendly gateway to the Core blockchain.
          <br /><br />
          <span className="text-accent font-semibold">Why use Pulse Wallet?</span>
          <ul className="list-disc list-inside text-base text-text text-left my-3">
            <li>Claim your <span className="text-accent font-bold">Pulse Token</span> airdrop instantly.</li>
            <li>Earn <span className="text-accent font-bold">1 $PULSE</span> for every transaction you make.</li>
            <li>Stake <span className="text-accent font-bold">CORE</span> or <span className="text-accent font-bold">USDT</span> and earn <span className="text-accent font-bold">1% daily rewards</span>.</li>
            <li>No compromise on security or privacy – you control your keys.</li>
          </ul>
        </p>
        {!showMnemonic ? (
          <div className="w-full flex flex-col gap-4">
            <button
              className="w-full bg-accent text-primary font-semibold py-3 rounded-lg hover:bg-accent-dark transition"
              onClick={handleCreateWallet}
              disabled={isCreating}
            >
              {isCreating ? 'Creating Wallet...' : 'Create New Wallet'}
            </button>
            <button
              className="w-full bg-white border border-accent text-accent font-semibold py-3 rounded-lg hover:bg-accent hover:text-primary transition flex items-center justify-center shadow"
              style={{ fontSize: '1.125rem', letterSpacing: 0.5 }}
              onClick={() => navigate('/import')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Import Existing Wallet
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <p className="text-accent font-bold text-lg mb-2 text-center">Your Recovery Phrase</p>
            <div className="bg-secondary border border-accent rounded-lg p-4 text-center mb-3 select-all cursor-pointer text-text">
              {mnemonic}
            </div>
            <p className="text-xs text-red-500 mb-4 text-center">
              Please write down or securely save this phrase. It is the ONLY way to recover your wallet!
            </p>
            <button
              className="w-full bg-accent text-primary font-semibold py-3 rounded-lg hover:bg-accent-dark transition"
              onClick={handleSaveAndLogin}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'I’ve saved my phrase, proceed to Dashboard'}
            </button>
            <button
              className="w-full mt-2 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300 transition"
              onClick={() => setShowMnemonic(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <footer className="mt-6 text-text text-sm opacity-70">
        &copy; {new Date().getFullYear()} Pulse Wallet. All rights reserved.
      </footer>
    </div>
  );
};

export default Welcome;