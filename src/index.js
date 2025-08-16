const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const escrowRoutes = require('./routes/escrow');
const referralRoutes = require('./routes/referral');
const poolRoutes = require('./routes/pool');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    name: 'Rideshare Bridge API',
    version: '0.1.0',
    description: 'Blockchain bridge API for rideshare payments, escrow, and referrals',
    status: 'running',
    endpoints: {
      escrow: '/api/escrow',
      referral: '/api/referral',
      pool: '/api/pool'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/escrow', escrowRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/pool', poolRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/escrow/initiate',
      'POST /api/escrow/release',
      'POST /api/escrow/cancel',
      'POST /api/referral/track',
      'GET /api/pool/status'
    ]
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Rideshare Bridge API server running on port ${PORT}`);
  console.log(`📋 API documentation available at http://localhost:${PORT}`);
  console.log(`💓 Health check available at http://localhost:${PORT}/health`);
});

module.exports = app;