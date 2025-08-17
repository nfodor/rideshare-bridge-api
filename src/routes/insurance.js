const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createBlockchainService } = require('../utils/blockchain-factory');
const { insuranceQuoteSchema, insurancePurchaseSchema } = require('../utils/validation');

const router = express.Router();
const blockchainService = createBlockchainService();

// In-memory storage for insurance policies (would be in database in production)
const policies = new Map();
const driverProfiles = new Map();

// Calculate insurance premium based on driver profile and ride details
function calculatePremium(rideAmount, driverProfile = {}) {
  const basePremium = parseFloat(rideAmount) * 0.02; // 2% of ride cost
  
  // Safety score multiplier (0.5x to 2.0x)
  const safetyScore = driverProfile.safetyScore || 500;
  const safetyMultiplier = Math.max(0.5, 2.0 - (safetyScore / 500));
  
  // Pool contribution discount (up to 25% off)
  const poolContributions = parseFloat(driverProfile.poolContributions || 0);
  const poolDiscount = Math.min(0.25, poolContributions / 1000);
  
  // Experience bonus (up to 15% off for experienced drivers)
  const totalRides = driverProfile.totalRides || 0;
  const experienceDiscount = Math.min(0.15, totalRides / 10000);
  
  const adjustedPremium = basePremium * safetyMultiplier;
  const finalPremium = adjustedPremium * (1 - poolDiscount - experienceDiscount);
  
  return {
    basePremium: basePremium.toFixed(2),
    safetyMultiplier: safetyMultiplier.toFixed(2),
    poolDiscount: (poolDiscount * 100).toFixed(0),
    experienceDiscount: (experienceDiscount * 100).toFixed(0),
    finalPremium: finalPremium.toFixed(2),
    discountPercentage: ((1 - finalPremium / basePremium) * 100).toFixed(0)
  };
}

// Get insurance quote
router.post('/quote', async (req, res, next) => {
  try {
    const { error, value } = insuranceQuoteSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { rideAmount, walletAddress, userType } = value;
    
    // Get or create driver profile
    let driverProfile = driverProfiles.get(walletAddress);
    if (!driverProfile) {
      driverProfile = {
        walletAddress,
        safetyScore: 750, // Default score
        totalRides: 0,
        poolContributions: '0',
        accidentHistory: []
      };
      driverProfiles.set(walletAddress, driverProfile);
    }

    const premium = calculatePremium(rideAmount, driverProfile);
    const coverageAmount = userType === 'driver' ? '1000000' : '500000';

    res.json({
      success: true,
      quote: {
        quoteId: `quote_${uuidv4()}`,
        walletAddress,
        userType,
        rideAmount,
        coverageAmount,
        premium: premium.finalPremium,
        premiumBreakdown: premium,
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        driverProfile: {
          safetyScore: driverProfile.safetyScore,
          totalRides: driverProfile.totalRides,
          discountEligibility: {
            poolDiscount: premium.poolDiscount,
            experienceDiscount: premium.experienceDiscount,
            totalDiscount: premium.discountPercentage
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Purchase insurance policy
router.post('/purchase', async (req, res, next) => {
  try {
    const { error, value } = insurancePurchaseSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { walletAddress, rideId, coverageAmount, premium } = value;
    const policyId = `pol_${uuidv4()}`;

    // Create policy
    const policy = {
      policyId,
      walletAddress,
      rideId,
      coverageAmount: coverageAmount || '1000000',
      premium,
      effectiveDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      status: 'active',
      transactionHash: `0x${uuidv4().replace(/-/g, '')}`, // Mock transaction hash
      blockNumber: Math.floor(Math.random() * 1000000)
    };

    policies.set(policyId, policy);

    // Update driver profile
    const driverProfile = driverProfiles.get(walletAddress);
    if (driverProfile) {
      driverProfile.totalRides++;
      driverProfile.poolContributions = (
        parseFloat(driverProfile.poolContributions) + parseFloat(premium)
      ).toFixed(2);
    }

    res.status(201).json({
      success: true,
      message: 'Insurance policy purchased successfully',
      policy: {
        policyId: policy.policyId,
        walletAddress: policy.walletAddress,
        rideId: policy.rideId,
        coverageAmount: policy.coverageAmount,
        premium: policy.premium,
        effectiveDate: policy.effectiveDate,
        expirationDate: policy.expirationDate,
        status: policy.status,
        transactionHash: policy.transactionHash,
        blockNumber: policy.blockNumber
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user policies
router.get('/policies/:wallet', async (req, res, next) => {
  try {
    const { wallet } = req.params;
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    const userPolicies = Array.from(policies.values()).filter(
      policy => policy.walletAddress.toLowerCase() === wallet.toLowerCase()
    );

    res.json({
      success: true,
      wallet,
      totalPolicies: userPolicies.length,
      policies: userPolicies.map(policy => ({
        policyId: policy.policyId,
        rideId: policy.rideId,
        coverageAmount: policy.coverageAmount,
        premium: policy.premium,
        status: policy.status,
        effectiveDate: policy.effectiveDate,
        expirationDate: policy.expirationDate
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get specific policy details
router.get('/policy/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = policies.get(id);

    if (!policy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Policy not found'
      });
    }

    res.json({
      success: true,
      policy: {
        policyId: policy.policyId,
        walletAddress: policy.walletAddress,
        rideId: policy.rideId,
        coverageAmount: policy.coverageAmount,
        premium: policy.premium,
        effectiveDate: policy.effectiveDate,
        expirationDate: policy.expirationDate,
        status: policy.status,
        transactionHash: policy.transactionHash,
        blockNumber: policy.blockNumber,
        isExpired: new Date(policy.expirationDate) < new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get driver safety score
router.get('/driver/score/:wallet', async (req, res, next) => {
  try {
    const { wallet } = req.params;
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    let driverProfile = driverProfiles.get(wallet);
    if (!driverProfile) {
      // Create default profile for new drivers
      driverProfile = {
        walletAddress: wallet,
        safetyScore: 750,
        totalRides: 0,
        poolContributions: '0',
        accidentHistory: []
      };
      driverProfiles.set(wallet, driverProfile);
    }

    res.json({
      success: true,
      wallet,
      safetyScore: driverProfile.safetyScore,
      scoreRange: {
        min: 0,
        max: 1000,
        current: driverProfile.safetyScore,
        rating: driverProfile.safetyScore >= 850 ? 'Excellent' :
                driverProfile.safetyScore >= 700 ? 'Good' :
                driverProfile.safetyScore >= 500 ? 'Fair' : 'Poor'
      },
      factors: {
        totalRides: driverProfile.totalRides,
        accidentCount: driverProfile.accidentHistory.length,
        poolContributions: driverProfile.poolContributions,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;