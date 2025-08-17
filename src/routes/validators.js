/**
 * Validator Staking and Reputation Management
 * Implements staking system for community validators with reputation tracking
 */

const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock database for validators
const validators = new Map();
const stakingConfig = {
  minimumStake: 1000, // 1000 tokens
  slashPercentage: 10, // 10% slashing
  reputationDecay: 0.1, // 10% decay per incorrect vote
  reputationBonus: 0.05 // 5% bonus per correct vote
};

// Validation schemas
const validatorRegistrationSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  stakeAmount: Joi.number().min(stakingConfig.minimumStake).required(),
  profileData: Joi.object({
    name: Joi.string().max(100).optional(),
    experience: Joi.string().max(500).optional(),
    specializations: Joi.array().items(Joi.string()).optional()
  }).optional()
});

const stakeModificationSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  action: Joi.string().valid('increase', 'decrease').required(),
  amount: Joi.number().positive().required(),
  reason: Joi.string().max(200).optional()
});

const slashingSchema = Joi.object({
  validatorAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  claimId: Joi.string().required(),
  reason: Joi.string().valid('incorrect_vote', 'malicious_behavior', 'collusion', 'negligence').required(),
  evidence: Joi.string().max(1000).required(),
  authorizedBy: Joi.string().required()
});

/**
 * Calculate validator eligibility score
 */
function calculateValidatorEligibility(validator) {
  const { reputation, stakedAmount, correctVotes, totalVotes, lastSlashTime } = validator;
  
  // Base eligibility requirements
  if (stakedAmount < stakingConfig.minimumStake) {
    return { eligible: false, reason: 'Insufficient stake', score: 0 };
  }
  
  if (reputation < 400) {
    return { eligible: false, reason: 'Low reputation score', score: 0 };
  }
  
  // Check if recently slashed (cooling off period)
  if (lastSlashTime && Date.now() - new Date(lastSlashTime).getTime() < 30 * 24 * 60 * 60 * 1000) {
    return { eligible: false, reason: 'Recently slashed - cooling off period', score: 0 };
  }
  
  // Calculate eligibility score
  const reputationScore = Math.min(reputation / 1000, 1) * 0.4; // 40% weight
  const stakeScore = Math.min(stakedAmount / (stakingConfig.minimumStake * 5), 1) * 0.3; // 30% weight
  const accuracyScore = totalVotes > 0 ? (correctVotes / totalVotes) * 0.3 : 0.15; // 30% weight
  
  const totalScore = reputationScore + stakeScore + accuracyScore;
  
  return {
    eligible: totalScore >= 0.6, // 60% minimum score
    score: totalScore,
    breakdown: {
      reputation: reputationScore,
      stake: stakeScore,
      accuracy: accuracyScore
    }
  };
}

/**
 * Update validator reputation based on voting accuracy
 */
function updateValidatorReputation(validatorAddress, correct) {
  const validator = validators.get(validatorAddress);
  if (!validator) return null;
  
  validator.totalVotes += 1;
  
  if (correct) {
    validator.correctVotes += 1;
    validator.reputation = Math.min(1000, validator.reputation + (validator.reputation * stakingConfig.reputationBonus));
  } else {
    validator.reputation = Math.max(0, validator.reputation - (validator.reputation * stakingConfig.reputationDecay));
  }
  
  validator.lastVoteTime = new Date().toISOString();
  validator.accuracy = validator.totalVotes > 0 ? validator.correctVotes / validator.totalVotes : 0;
  
  validators.set(validatorAddress, validator);
  return validator;
}

/**
 * Execute validator slashing
 */
function executeSlashing(validatorAddress, reason, amount) {
  const validator = validators.get(validatorAddress);
  if (!validator) return null;
  
  const slashAmount = (validator.stakedAmount * amount) / 100;
  validator.stakedAmount -= slashAmount;
  validator.reputation = Math.max(0, validator.reputation - 50);
  validator.lastSlashTime = new Date().toISOString();
  validator.slashingHistory = validator.slashingHistory || [];
  validator.slashingHistory.push({
    date: new Date().toISOString(),
    reason,
    amount: slashAmount,
    newStake: validator.stakedAmount,
    newReputation: validator.reputation
  });
  
  // Deactivate if stake falls below minimum
  if (validator.stakedAmount < stakingConfig.minimumStake) {
    validator.active = false;
    validator.deactivatedAt = new Date().toISOString();
    validator.deactivationReason = 'Insufficient stake after slashing';
  }
  
  validators.set(validatorAddress, validator);
  return { validator, slashAmount };
}

// Routes

/**
 * POST /api/validators/register
 * Register as a new validator
 */
router.post('/register', async (req, res) => {
  try {
    const { error, value } = validatorRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }
    
    const { walletAddress, stakeAmount, profileData } = value;
    
    // Check if already registered
    if (validators.has(walletAddress)) {
      return res.status(409).json({
        success: false,
        error: 'Validator already registered'
      });
    }
    
    // Create validator record
    const validator = {
      walletAddress,
      stakedAmount: stakeAmount,
      reputation: 500, // Start at middle reputation
      correctVotes: 0,
      totalVotes: 0,
      accuracy: 0,
      active: true,
      registeredAt: new Date().toISOString(),
      lastVoteTime: null,
      lastSlashTime: null,
      profileData: profileData || {},
      slashingHistory: []
    };
    
    validators.set(walletAddress, validator);
    
    const eligibility = calculateValidatorEligibility(validator);
    
    res.status(201).json({
      success: true,
      message: 'Validator registered successfully',
      validator: {
        walletAddress: validator.walletAddress,
        stakedAmount: validator.stakedAmount,
        reputation: validator.reputation,
        active: validator.active,
        registeredAt: validator.registeredAt
      },
      eligibility,
      stakingInfo: {
        minimumStake: stakingConfig.minimumStake,
        currentStake: validator.stakedAmount,
        stakingPower: (validator.stakedAmount / stakingConfig.minimumStake).toFixed(2) + 'x'
      }
    });
    
  } catch (error) {
    console.error('Validator registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/validators/:walletAddress
 * Get validator details
 */
router.get('/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
    const validator = validators.get(walletAddress);
    
    if (!validator) {
      return res.status(404).json({
        success: false,
        error: 'Validator not found'
      });
    }
    
    const eligibility = calculateValidatorEligibility(validator);
    
    res.json({
      success: true,
      validator: {
        ...validator,
        eligibility,
        performance: {
          accuracy: `${(validator.accuracy * 100).toFixed(1)}%`,
          totalVotes: validator.totalVotes,
          correctVotes: validator.correctVotes,
          reputationTrend: validator.reputation >= 500 ? 'Stable' : 'Declining'
        },
        staking: {
          currentStake: validator.stakedAmount,
          minimumRequired: stakingConfig.minimumStake,
          stakingRatio: (validator.stakedAmount / stakingConfig.minimumStake).toFixed(2),
          atRisk: validator.stakedAmount < stakingConfig.minimumStake * 1.5
        }
      }
    });
    
  } catch (error) {
    console.error('Validator lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/validators/stake
 * Modify validator stake
 */
router.post('/stake', async (req, res) => {
  try {
    const { error, value } = stakeModificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }
    
    const { walletAddress, action, amount, reason } = value;
    const validator = validators.get(walletAddress);
    
    if (!validator) {
      return res.status(404).json({
        success: false,
        error: 'Validator not found'
      });
    }
    
    const previousStake = validator.stakedAmount;
    
    if (action === 'increase') {
      validator.stakedAmount += amount;
    } else {
      if (validator.stakedAmount - amount < 0) {
        return res.status(422).json({
          success: false,
          error: 'Cannot withdraw more than staked amount',
          currentStake: validator.stakedAmount,
          requestedWithdrawal: amount
        });
      }
      validator.stakedAmount -= amount;
    }
    
    // Check if modification affects active status
    if (validator.stakedAmount < stakingConfig.minimumStake && validator.active) {
      validator.active = false;
      validator.deactivatedAt = new Date().toISOString();
      validator.deactivationReason = 'Stake below minimum requirement';
    } else if (validator.stakedAmount >= stakingConfig.minimumStake && !validator.active && 
               validator.deactivationReason === 'Stake below minimum requirement') {
      validator.active = true;
      validator.reactivatedAt = new Date().toISOString();
    }
    
    validators.set(walletAddress, validator);
    
    const eligibility = calculateValidatorEligibility(validator);
    
    res.json({
      success: true,
      message: `Stake ${action}d successfully`,
      stakeModification: {
        action,
        amount,
        previousStake,
        newStake: validator.stakedAmount,
        reason,
        timestamp: new Date().toISOString()
      },
      validator: {
        walletAddress: validator.walletAddress,
        active: validator.active,
        reputation: validator.reputation,
        eligibility
      }
    });
    
  } catch (error) {
    console.error('Stake modification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/validators/slash
 * Execute validator slashing for misconduct
 */
router.post('/slash', async (req, res) => {
  try {
    const { error, value } = slashingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }
    
    const { validatorAddress, claimId, reason, evidence, authorizedBy } = value;
    
    const result = executeSlashing(validatorAddress, reason, stakingConfig.slashPercentage);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Validator not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Validator slashed successfully',
      slashing: {
        validatorAddress,
        claimId,
        reason,
        evidence,
        slashAmount: result.slashAmount,
        authorizedBy,
        executedAt: new Date().toISOString()
      },
      validator: {
        newStake: result.validator.stakedAmount,
        newReputation: result.validator.reputation,
        active: result.validator.active,
        totalSlashings: result.validator.slashingHistory.length
      }
    });
    
  } catch (error) {
    console.error('Validator slashing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/validators/eligible
 * Get list of eligible validators for claim review
 */
router.get('/eligible', (req, res) => {
  try {
    const { minScore = 0.6, limit = 10 } = req.query;
    
    const eligibleValidators = Array.from(validators.values())
      .map(validator => ({
        ...validator,
        eligibility: calculateValidatorEligibility(validator)
      }))
      .filter(v => v.active && v.eligibility.eligible && v.eligibility.score >= parseFloat(minScore))
      .sort((a, b) => b.eligibility.score - a.eligibility.score)
      .slice(0, parseInt(limit))
      .map(v => ({
        walletAddress: v.walletAddress,
        reputation: v.reputation,
        stakedAmount: v.stakedAmount,
        accuracy: v.accuracy,
        totalVotes: v.totalVotes,
        eligibilityScore: v.eligibility.score,
        lastVoteTime: v.lastVoteTime
      }));
    
    res.json({
      success: true,
      eligibleValidators,
      totalEligible: eligibleValidators.length,
      selectionCriteria: {
        minimumScore: parseFloat(minScore),
        minimumStake: stakingConfig.minimumStake,
        minimumReputation: 400
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Eligible validators lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/validators/:walletAddress/vote-result
 * Update validator reputation based on vote accuracy
 */
router.post('/:walletAddress/vote-result', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { correct, claimId, consensusReached } = req.body;
    
    if (typeof correct !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Vote result must be boolean (correct/incorrect)'
      });
    }
    
    const updatedValidator = updateValidatorReputation(walletAddress, correct);
    
    if (!updatedValidator) {
      return res.status(404).json({
        success: false,
        error: 'Validator not found'
      });
    }
    
    const eligibility = calculateValidatorEligibility(updatedValidator);
    
    res.json({
      success: true,
      message: 'Vote result processed successfully',
      voteResult: {
        claimId,
        correct,
        consensusReached,
        processedAt: new Date().toISOString()
      },
      validator: {
        walletAddress: updatedValidator.walletAddress,
        newReputation: updatedValidator.reputation,
        newAccuracy: updatedValidator.accuracy,
        totalVotes: updatedValidator.totalVotes,
        correctVotes: updatedValidator.correctVotes,
        eligibility
      }
    });
    
  } catch (error) {
    console.error('Vote result processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/validators/stats
 * Get validator network statistics
 */
router.get('/stats', (req, res) => {
  try {
    const allValidators = Array.from(validators.values());
    const activeValidators = allValidators.filter(v => v.active);
    
    const stats = {
      totalValidators: allValidators.length,
      activeValidators: activeValidators.length,
      totalStaked: allValidators.reduce((sum, v) => sum + v.stakedAmount, 0),
      averageReputation: activeValidators.length > 0 ? 
        activeValidators.reduce((sum, v) => sum + v.reputation, 0) / activeValidators.length : 0,
      averageAccuracy: activeValidators.length > 0 ? 
        activeValidators.reduce((sum, v) => sum + v.accuracy, 0) / activeValidators.length : 0,
      totalVotes: allValidators.reduce((sum, v) => sum + v.totalVotes, 0),
      totalSlashings: allValidators.reduce((sum, v) => sum + (v.slashingHistory?.length || 0), 0),
      networkHealth: {
        eligibleValidators: activeValidators.filter(v => 
          calculateValidatorEligibility(v).eligible).length,
        averageStakeRatio: activeValidators.length > 0 ? 
          (activeValidators.reduce((sum, v) => sum + v.stakedAmount, 0) / 
           (activeValidators.length * stakingConfig.minimumStake)).toFixed(2) : 0,
        reputationDistribution: {
          excellent: activeValidators.filter(v => v.reputation >= 800).length,
          good: activeValidators.filter(v => v.reputation >= 600 && v.reputation < 800).length,
          average: activeValidators.filter(v => v.reputation >= 400 && v.reputation < 600).length,
          poor: activeValidators.filter(v => v.reputation < 400).length
        }
      }
    };
    
    res.json({
      success: true,
      statistics: stats,
      stakingConfig,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Validator stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;