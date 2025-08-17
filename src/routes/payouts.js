/**
 * Insurance Claim Payout Management
 * Implements automated claim payouts based on validation results
 */

const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock database for payouts
const payouts = new Map();
const emergencyFund = {
  totalFund: 1000000, // $1M emergency fund
  availableAmount: 800000,
  lastActivation: null,
  emergencyActive: false,
  activationThreshold: 0.8 // 80% pool utilization
};

// Validation schemas
const payoutExecutionSchema = Joi.object({
  claimId: Joi.string().required(),
  validationResults: Joi.object({
    aiApproved: Joi.boolean().required(),
    communityConsensus: Joi.boolean().required(),
    fraudScore: Joi.number().min(0).max(1).required(),
    jurorApprovalRate: Joi.number().min(0).max(1).required()
  }).required(),
  override: Joi.object({
    enabled: Joi.boolean().default(false),
    reason: Joi.string().when('enabled', { is: true, then: Joi.required() }),
    authorizedBy: Joi.string().when('enabled', { is: true, then: Joi.required() })
  }).optional()
});

const emergencyPayoutSchema = Joi.object({
  claimId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  emergencyReason: Joi.string().valid('mass_event', 'liquidity_crisis', 'regulatory_order').required(),
  authorizedBy: Joi.string().required()
});

/**
 * Calculate automatic payout eligibility
 */
function calculatePayoutEligibility(claim, validationResults) {
  const { aiApproved, communityConsensus, fraudScore, jurorApprovalRate } = validationResults;
  
  // AI auto-approval for low-risk claims
  if (claim.claimAmount <= 1000 && fraudScore < 0.3 && aiApproved) {
    return {
      eligible: true,
      trigger: 'AI_APPROVED',
      confidence: 0.95,
      processingTime: '1 hour'
    };
  }
  
  // Community consensus for mid-range claims
  if (communityConsensus && jurorApprovalRate >= 0.66 && fraudScore < 0.5) {
    return {
      eligible: true,
      trigger: 'COMMUNITY_CONSENSUS',
      confidence: jurorApprovalRate,
      processingTime: '24 hours'
    };
  }
  
  // High-value claims require manual review
  if (claim.claimAmount > 50000) {
    return {
      eligible: false,
      trigger: 'MANUAL_REVIEW_REQUIRED',
      confidence: 0,
      processingTime: '7-14 days',
      reason: 'High-value claim requires additional verification'
    };
  }
  
  // Fraud detection triggered
  if (fraudScore >= 0.7) {
    return {
      eligible: false,
      trigger: 'FRAUD_DETECTED',
      confidence: 0,
      processingTime: 'Indefinite',
      reason: 'High fraud score requires investigation'
    };
  }
  
  return {
    eligible: false,
    trigger: 'INSUFFICIENT_VALIDATION',
    confidence: 0,
    processingTime: 'Pending',
    reason: 'Requires additional community review or evidence'
  };
}

/**
 * Execute claim payout
 */
function executePayout(claim, amount, trigger) {
  const payoutId = uuidv4();
  const payout = {
    payoutId,
    claimId: claim.claimId,
    beneficiaryWallet: claim.claimantWallet,
    amount,
    trigger,
    status: 'processing',
    createdAt: new Date().toISOString(),
    executedAt: null,
    transactionHash: null,
    gasUsed: null
  };
  
  // Simulate blockchain transaction
  setTimeout(() => {
    payout.status = 'completed';
    payout.executedAt = new Date().toISOString();
    payout.transactionHash = '0x' + Math.random().toString(16).substr(2, 64);
    payout.gasUsed = Math.floor(Math.random() * 50000) + 21000;
  }, 2000);
  
  payouts.set(payoutId, payout);
  return payout;
}

/**
 * Check emergency conditions
 */
function checkEmergencyConditions() {
  // Simulate pool utilization calculation
  const mockPoolStats = {
    totalFunds: 5000000,
    pendingClaims: 3800000,
    recentClaimsCount: 45,
    availableLiquidity: 600000
  };
  
  const poolUtilization = mockPoolStats.pendingClaims / mockPoolStats.totalFunds;
  const massClaimEvent = mockPoolStats.recentClaimsCount > 50;
  const liquidityShortfall = mockPoolStats.availableLiquidity < (mockPoolStats.totalFunds * 0.1);
  
  return {
    emergencyActive: poolUtilization > 0.8 || massClaimEvent || liquidityShortfall,
    poolUtilization,
    massClaimEvent,
    liquidityShortfall,
    conditions: {
      poolUtilization: `${(poolUtilization * 100).toFixed(1)}%`,
      recentClaims: mockPoolStats.recentClaimsCount,
      availableLiquidity: `$${mockPoolStats.availableLiquidity.toLocaleString()}`
    }
  };
}

// Routes

/**
 * POST /api/payouts/execute
 * Execute approved claim payout
 */
router.post('/execute', async (req, res) => {
  try {
    const { error, value } = payoutExecutionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }
    
    const { claimId, validationResults, override } = value;
    
    // Mock claim lookup
    const claim = {
      claimId,
      claimAmount: 5000,
      claimantWallet: '0x' + Math.random().toString(16).substr(2, 40),
      incidentType: 'accident',
      status: 'validated'
    };
    
    // Check payout eligibility
    const eligibility = calculatePayoutEligibility(claim, validationResults);
    
    // Handle override authorization
    if (override?.enabled && !eligibility.eligible) {
      eligibility.eligible = true;
      eligibility.trigger = 'MANUAL_OVERRIDE';
      eligibility.confidence = 1.0;
      eligibility.overrideReason = override.reason;
      eligibility.authorizedBy = override.authorizedBy;
    }
    
    if (!eligibility.eligible) {
      return res.status(422).json({
        success: false,
        error: 'Claim not eligible for payout',
        eligibility,
        requiresAction: eligibility.trigger
      });
    }
    
    // Execute payout
    const payout = executePayout(claim, claim.claimAmount, eligibility.trigger);
    
    res.status(201).json({
      success: true,
      message: 'Payout initiated successfully',
      payout: {
        payoutId: payout.payoutId,
        claimId: payout.claimId,
        amount: payout.amount,
        beneficiaryWallet: payout.beneficiaryWallet,
        trigger: payout.trigger,
        status: payout.status,
        estimatedCompletion: eligibility.processingTime
      },
      eligibility,
      blockchain: {
        network: process.env.BLOCKCHAIN_NETWORK || 'sepolia',
        estimatedGas: '45000',
        estimatedFee: '$2.50'
      }
    });
    
  } catch (error) {
    console.error('Payout execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/payouts/:payoutId
 * Get payout status and details
 */
router.get('/:payoutId', (req, res) => {
  try {
    const { payoutId } = req.params;
    const payout = payouts.get(payoutId);
    
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }
    
    res.json({
      success: true,
      payout: {
        ...payout,
        blockchain: {
          network: process.env.BLOCKCHAIN_NETWORK || 'sepolia',
          explorerUrl: payout.transactionHash ? 
            `https://sepolia.etherscan.io/tx/${payout.transactionHash}` : null
        }
      }
    });
    
  } catch (error) {
    console.error('Payout lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/payouts/claim/:claimId
 * Get all payouts for a specific claim
 */
router.get('/claim/:claimId', (req, res) => {
  try {
    const { claimId } = req.params;
    const claimPayouts = Array.from(payouts.values())
      .filter(payout => payout.claimId === claimId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      claimId,
      payouts: claimPayouts,
      totalPaidAmount: claimPayouts
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      payoutCount: claimPayouts.length
    });
    
  } catch (error) {
    console.error('Claim payouts lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/payouts/emergency
 * Execute emergency payout (requires special authorization)
 */
router.post('/emergency', async (req, res) => {
  try {
    const { error, value } = emergencyPayoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }
    
    const { claimId, amount, emergencyReason, authorizedBy } = value;
    
    // Check emergency conditions
    const emergencyStatus = checkEmergencyConditions();
    
    if (!emergencyStatus.emergencyActive) {
      return res.status(422).json({
        success: false,
        error: 'Emergency conditions not met',
        currentConditions: emergencyStatus.conditions
      });
    }
    
    // Check emergency fund availability
    if (amount > emergencyFund.availableAmount) {
      return res.status(422).json({
        success: false,
        error: 'Insufficient emergency funds',
        available: emergencyFund.availableAmount,
        requested: amount
      });
    }
    
    // Execute emergency payout
    const payout = executePayout(
      { claimId, claimAmount: amount, claimantWallet: '0x' + Math.random().toString(16).substr(2, 40) },
      amount,
      'EMERGENCY_OVERRIDE'
    );
    
    // Update emergency fund
    emergencyFund.availableAmount -= amount;
    emergencyFund.lastActivation = new Date().toISOString();
    
    res.status(201).json({
      success: true,
      message: 'Emergency payout executed',
      payout: {
        payoutId: payout.payoutId,
        claimId: payout.claimId,
        amount: payout.amount,
        trigger: payout.trigger,
        emergencyReason,
        authorizedBy
      },
      emergencyFund: {
        remainingAmount: emergencyFund.availableAmount,
        utilizationRate: `${(((emergencyFund.totalFund - emergencyFund.availableAmount) / emergencyFund.totalFund) * 100).toFixed(1)}%`
      }
    });
    
  } catch (error) {
    console.error('Emergency payout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/payouts/emergency/status
 * Get emergency fund status and conditions
 */
router.get('/emergency/status', (req, res) => {
  try {
    const emergencyStatus = checkEmergencyConditions();
    
    res.json({
      success: true,
      emergencyFund: {
        totalFund: emergencyFund.totalFund,
        availableAmount: emergencyFund.availableAmount,
        utilizationRate: `${(((emergencyFund.totalFund - emergencyFund.availableAmount) / emergencyFund.totalFund) * 100).toFixed(1)}%`,
        lastActivation: emergencyFund.lastActivation,
        emergencyActive: emergencyStatus.emergencyActive
      },
      conditions: emergencyStatus.conditions,
      triggers: {
        poolUtilizationLimit: '80%',
        massClaimThreshold: '50 claims/day',
        liquidityThreshold: '10% of total fund'
      },
      activationHistory: [
        {
          date: '2024-01-15T10:30:00Z',
          reason: 'Mass weather event - 47 claims in 6 hours',
          amountUsed: 125000,
          duration: '48 hours'
        }
      ]
    });
    
  } catch (error) {
    console.error('Emergency status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/payouts/stats
 * Get payout statistics and pool performance
 */
router.get('/stats', (req, res) => {
  try {
    const allPayouts = Array.from(payouts.values());
    const completedPayouts = allPayouts.filter(p => p.status === 'completed');
    
    const stats = {
      totalPayouts: allPayouts.length,
      completedPayouts: completedPayouts.length,
      totalPaidAmount: completedPayouts.reduce((sum, p) => sum + p.amount, 0),
      averagePayoutAmount: completedPayouts.length > 0 ? 
        completedPayouts.reduce((sum, p) => sum + p.amount, 0) / completedPayouts.length : 0,
      payoutsByTrigger: {
        AI_APPROVED: allPayouts.filter(p => p.trigger === 'AI_APPROVED').length,
        COMMUNITY_CONSENSUS: allPayouts.filter(p => p.trigger === 'COMMUNITY_CONSENSUS').length,
        MANUAL_OVERRIDE: allPayouts.filter(p => p.trigger === 'MANUAL_OVERRIDE').length,
        EMERGENCY_OVERRIDE: allPayouts.filter(p => p.trigger === 'EMERGENCY_OVERRIDE').length
      },
      processingTimes: {
        aiApproved: '1 hour average',
        communityConsensus: '18 hours average',
        manualReview: '5-7 days average'
      },
      successRate: allPayouts.length > 0 ? 
        `${((completedPayouts.length / allPayouts.length) * 100).toFixed(1)}%` : '0%'
    };
    
    res.json({
      success: true,
      statistics: stats,
      emergencyFundStatus: {
        totalFund: emergencyFund.totalFund,
        availableAmount: emergencyFund.availableAmount,
        utilizationRate: `${(((emergencyFund.totalFund - emergencyFund.availableAmount) / emergencyFund.totalFund) * 100).toFixed(1)}%`
      },
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Payout stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;