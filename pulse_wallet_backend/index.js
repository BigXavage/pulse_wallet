require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());
app.use(cors());

const {
  ADMIN_PRIVATE_KEY,
  CORE_RPC_URL,
  PULSE_CONTRACT_ADDRESS
} = process.env;

if (!ADMIN_PRIVATE_KEY) {
  console.error('ADMIN_PRIVATE_KEY missing in .env');
  process.exit(1);
}
if (!CORE_RPC_URL) {
  console.error('CORE_RPC_URL missing in .env');
  process.exit(1);
}
if (!PULSE_CONTRACT_ADDRESS) {
  console.error('PULSE_CONTRACT_ADDRESS missing in .env');
  process.exit(1);
}

const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
const provider = new ethers.JsonRpcProvider(CORE_RPC_URL);

// Minimal ABI for hasClaimed and getClaimableAmount
const PULSE_ABI = [
  "function getClaimableAmount(address) view returns (uint256)",
  "function hasClaimed(address) view returns (bool)"
];

app.post('/api/wallet/sign-claim', async (req, res) => {
  try {
    const { address, referrer } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ message: 'Valid address is required' });
    }

    // 1. Connect to PULSE contract
    const pulseContract = new ethers.Contract(PULSE_CONTRACT_ADDRESS, PULSE_ABI, provider);

    // 2. Check if already claimed
    const alreadyClaimed = await pulseContract.hasClaimed(address);
    if (alreadyClaimed) {
      return res.status(400).json({ message: 'Tokens already claimed' });
    }

    // 3. Get claimable amount (uint256)
    const amount = await pulseContract.getClaimableAmount(address);
    if (!amount || amount.eq(0)) {
      return res.status(400).json({ message: 'No claimable tokens' });
    }

    // 4. Use referrer if provided, else 0x00
    let refAddr = referrer && ethers.isAddress(referrer)
      ? referrer
      : "0x0000000000000000000000000000000000000000";

    // 5. Nonce (use timestamp)
    const nonce = Date.now();

    // 6. Compute the packed hash
    const packed = ethers.solidityPacked(
      ['address', 'uint256', 'address', 'uint256'],
      [address, amount, refAddr, nonce]
    );
    const messageHash = ethers.keccak256(packed);

    // 7. Admin signature (EIP-191)
    const adminSig = await adminWallet.signMessage(ethers.getBytes(messageHash));

    // 8. Return values to the frontend
    res.status(200).json({
      amount: amount.toString(),
      nonce,
      adminSig
    });
  } catch (err) {
    console.error('sign-claim error:', err);
    res.status(500).json({ message: err.reason || err.message || "Internal server error" });
  }
});

// (Optional) Keep your old route if you still need it, or remove if not used:
// app.post('/api/coredao/claim-signature', ...);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});