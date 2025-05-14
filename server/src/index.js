const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const walletRoutes = require('./routes/wallet');
const { PORT, MONGO_URI } = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/wallet', walletRoutes);

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});