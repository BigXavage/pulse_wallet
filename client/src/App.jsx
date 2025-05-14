// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WalletDashboard from './pages/WalletDashboard';
import WalletImport from './pages/WalletImport';
import StakingSection from './components/StakingSection';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    const selectedWallet = localStorage.getItem('selectedWallet');
    if (selectedWallet) {
      const wallets = JSON.parse(localStorage.getItem('wallets') || '[]');
      const foundWallet = wallets.find((w) => w.address === selectedWallet);
      if (foundWallet) {
        setWallet(foundWallet);
      }
    }
  }, []);

  const selectWallet = (address) => {
    const wallets = JSON.parse(localStorage.getItem('wallets') || '[]');
    const foundWallet = wallets.find((w) => w.address === address);
    if (foundWallet) {
      setWallet(foundWallet);
      localStorage.setItem('selectedWallet', address);
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={wallet ? <Navigate to="/dashboard" /> : <Navigate to="/import" />}
        />
        <Route
          path="/dashboard"
          element={
            wallet ? (
              <WalletDashboard />
            ) : (
              <Navigate to="/import" />
            )
          }
        />
        <Route
          path="/import"
          element={<WalletImport setWallet={setWallet} />}
        />
        <Route
          path="/staking"
          element={wallet ? <StakingSection wallet={wallet} /> : <Navigate to="/import" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;