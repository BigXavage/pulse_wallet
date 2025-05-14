require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,
  CORE_RPC_URL: process.env.CORE_RPC_URL || 'https://rpc.coredao.org',
  PULSE_CONTRACT_ADDRESS: process.env.PULSE_CONTRACT_ADDRESS || '0x9d0714497318CDE8F285b51f1f896aE88e26a52F',
};