const { ethers } = require('ethers');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'http://localhost:8545'
    );
    this.escrows = new Map();
    this.insurancePool = {
      totalContributions: '0',
      contributorCount: 0,
      contributions: []
    };
  }

  generateEscrowAddress() {
    return ethers.Wallet.createRandom().address;
  }

  async createEscrow(rideId, riderWallet, driverWallet, amount, currency = 'ETH') {
    const escrowAddress = this.generateEscrowAddress();
    const escrow = {
      rideId,
      escrowAddress,
      riderWallet,
      driverWallet,
      amount,
      currency,
      status: 'active',
      createdAt: new Date().toISOString(),
      milestones: {
        initiated: true,
        driverAccepted: false,
        rideStarted: false,
        rideCompleted: false,
        paymentReleased: false
      }
    };

    this.escrows.set(rideId, escrow);
    return escrow;
  }

  async getEscrow(rideId) {
    return this.escrows.get(rideId);
  }

  async releaseEscrow(rideId, signature) {
    const escrow = this.escrows.get(rideId);
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'active') {
      throw new Error('Escrow is not active');
    }

    escrow.status = 'released';
    escrow.milestones.rideCompleted = true;
    escrow.milestones.paymentReleased = true;
    escrow.releasedAt = new Date().toISOString();
    escrow.signature = signature;

    return escrow;
  }

  async cancelEscrow(rideId, signature) {
    const escrow = this.escrows.get(rideId);
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'active') {
      throw new Error('Escrow is not active');
    }

    escrow.status = 'cancelled';
    escrow.cancelledAt = new Date().toISOString();
    escrow.signature = signature;

    const refundAmount = this.calculateRefund(escrow);
    escrow.refundAmount = refundAmount;

    return escrow;
  }

  calculateRefund(escrow) {
    const amount = parseFloat(escrow.amount);
    if (escrow.milestones.rideStarted) {
      return (amount * 0.5).toString();
    }
    return (amount * 0.9).toString();
  }

  async contributeToInsurance(contributor, amount) {
    const contribution = {
      contributor,
      amount,
      timestamp: new Date().toISOString(),
      transactionHash: ethers.keccak256(ethers.toUtf8Bytes(`${contributor}${amount}${Date.now()}`))
    };

    this.insurancePool.contributions.push(contribution);
    this.insurancePool.totalContributions = (
      parseFloat(this.insurancePool.totalContributions) + parseFloat(amount)
    ).toString();
    this.insurancePool.contributorCount++;

    return contribution;
  }

  getInsurancePoolStatus() {
    return {
      totalBalance: this.insurancePool.totalContributions,
      contributorCount: this.insurancePool.contributorCount,
      totalContributions: this.insurancePool.contributions.length,
      lastUpdated: new Date().toISOString()
    };
  }

  async validateSignature(message, signature, expectedSigner) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    } catch (error) {
      return false;
    }
  }
}

module.exports = { BlockchainService };