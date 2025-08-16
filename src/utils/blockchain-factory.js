const { BlockchainService } = require('./blockchain');
const { RealBlockchainService } = require('./blockchain-real');

/**
 * Factory to create appropriate blockchain service based on environment
 */
function createBlockchainService() {
  const useRealBlockchain = process.env.USE_REAL_BLOCKCHAIN === 'true';
  
  if (useRealBlockchain) {
    console.log('🔗 Initializing REAL blockchain service');
    return new RealBlockchainService();
  } else {
    console.log('🔧 Initializing MOCK blockchain service');
    return new BlockchainService();
  }
}

module.exports = { createBlockchainService };