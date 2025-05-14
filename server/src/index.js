const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const walletRoutes = require('./routes/wallet');
// Changed: Import connectDB from db.js
const { connectDB, PORT, MONGO_URI } = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/wallet', walletRoutes);

// Changed: Use connectDB function for MongoDB connection
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});