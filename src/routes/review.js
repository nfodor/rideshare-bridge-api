const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory storage (would be in database in production)
const reviews = new Map();
const votes = new Map();

// Mock review for testing
const mockReview = {
  reviewId: 'review_mock123',
  claimId: 'claim_mock456',
  claimDetails: {
    incidentType: 'collision',
    claimAmount: '5000',
    incidentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Minor collision at intersection, other driver ran red light'
  },
  aiAssessment: {
    fraudScore: 0.45,
    confidence: 0.78,
    redFlags: ['amount_unusual', 'timing_suspicious'],
    recommendation: 'community_review'
  },
  jurors: [
    '0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e5',
    '0x853e46Dd7f3e6f23B3C3D8c9c5f4f9b2e3d4f5f6',
    '0x123456789012345678901234567890123456789A',
    '0x987654321098765432109876543210987654321B',
    '0xABCDEF123456789012345678901234567890ABCD'
  ],
  votes: [],
  deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  status: 'in_review',
  consensusThreshold: 0.66,
  documents: [
    { type: 'police_report', uploaded: true, verified: true },
    { type: 'photos', uploaded: true, verified: true },
    { type: 'repair_estimate', uploaded: true, verified: false }
  ]
};

reviews.set(mockReview.reviewId, mockReview);

// Get review details
router.get('/:reviewId', async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = reviews.get(reviewId);

    if (!review) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Review not found'
      });
    }

    // Check if requester is a juror (in production, would verify JWT)
    const { juror } = req.query;
    const isJuror = juror && review.jurors.includes(juror);

    res.json({
      success: true,
      review: {
        reviewId: review.reviewId,
        claimId: review.claimId,
        deadline: review.deadline,
        status: review.status,
        jurorsAssigned: review.jurors.length,
        votesReceived: review.votes.length,
        consensusThreshold: (review.consensusThreshold * 100).toFixed(0) + '%',
        // Only show claim details to assigned jurors
        claimDetails: isJuror ? review.claimDetails : null,
        aiAssessment: {
          fraudScore: (review.aiAssessment.fraudScore * 100).toFixed(0) + '%',
          confidence: (review.aiAssessment.confidence * 100).toFixed(0) + '%',
          recommendation: review.aiAssessment.recommendation,
          redFlags: review.aiAssessment.redFlags
        },
        documents: isJuror ? review.documents : null,
        timeRemaining: calculateTimeRemaining(review.deadline)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Submit vote
router.post('/:reviewId/vote', async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { juror, decision, reasoning, confidence } = req.body;

    // Validate inputs
    if (!juror || !decision || !reasoning) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'juror, decision, and reasoning are required'
      });
    }

    // Validate decision
    const validDecisions = ['approve', 'deny', 'need_info'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid decision. Must be: approve, deny, or need_info'
      });
    }

    const review = reviews.get(reviewId);
    if (!review) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Review not found'
      });
    }

    // Check if juror is assigned to this review
    if (!review.jurors.includes(juror)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not assigned to this review'
      });
    }

    // Check if already voted
    const existingVote = review.votes.find(v => v.juror === juror);
    if (existingVote) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'You have already voted on this review'
      });
    }

    // Check deadline
    if (new Date() > new Date(review.deadline)) {
      return res.status(410).json({
        error: 'Gone',
        message: 'Review deadline has passed'
      });
    }

    // Record vote
    const vote = {
      voteId: `vote_${uuidv4()}`,
      reviewId,
      juror,
      decision,
      reasoning,
      confidence: confidence || 0.75,
      timestamp: new Date().toISOString()
    };

    review.votes.push(vote);
    
    // Store vote in juror's history
    if (!votes.has(juror)) {
      votes.set(juror, []);
    }
    votes.get(juror).push(vote);

    // Check if consensus reached
    const voteCount = review.votes.length;
    const jurorCount = review.jurors.length;
    const consensus = checkConsensus(review);

    res.json({
      success: true,
      message: 'Vote submitted successfully',
      vote: {
        voteId: vote.voteId,
        decision: vote.decision,
        timestamp: vote.timestamp
      },
      reviewStatus: {
        votesReceived: voteCount,
        votesRequired: jurorCount,
        consensusReached: consensus.reached,
        currentConsensus: consensus.decision
      }
    });

    // Auto-finalize if all votes are in
    if (voteCount === jurorCount) {
      finalizeReview(review);
    }
  } catch (error) {
    next(error);
  }
});

// Get review status
router.get('/:reviewId/status', async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = reviews.get(reviewId);

    if (!review) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Review not found'
      });
    }

    const consensus = checkConsensus(review);
    const voteBreakdown = getVoteBreakdown(review);

    res.json({
      success: true,
      reviewId,
      status: review.status,
      deadline: review.deadline,
      timeRemaining: calculateTimeRemaining(review.deadline),
      voting: {
        jurorsAssigned: review.jurors.length,
        votesReceived: review.votes.length,
        votesRemaining: review.jurors.length - review.votes.length,
        breakdown: voteBreakdown
      },
      consensus: {
        required: (review.consensusThreshold * 100).toFixed(0) + '%',
        current: consensus.percentage + '%',
        reached: consensus.reached,
        decision: consensus.decision
      }
    });
  } catch (error) {
    next(error);
  }
});

// Request more information
router.post('/:reviewId/question', async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { juror, question, documentType } = req.body;

    if (!juror || !question) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'juror and question are required'
      });
    }

    const review = reviews.get(reviewId);
    if (!review) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Review not found'
      });
    }

    // Check if juror is assigned
    if (!review.jurors.includes(juror)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not assigned to this review'
      });
    }

    // Store question (in production, would notify claimant)
    const infoRequest = {
      requestId: `req_${uuidv4()}`,
      reviewId,
      juror,
      question,
      documentType: documentType || 'general',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    res.json({
      success: true,
      message: 'Information request submitted',
      request: {
        requestId: infoRequest.requestId,
        status: infoRequest.status,
        expectedResponse: '24-48 hours'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function calculateTimeRemaining(deadline) {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

function checkConsensus(review) {
  if (review.votes.length === 0) {
    return { reached: false, decision: null, percentage: 0 };
  }

  const voteCount = {};
  review.votes.forEach(vote => {
    voteCount[vote.decision] = (voteCount[vote.decision] || 0) + 1;
  });

  let maxVotes = 0;
  let leadingDecision = null;
  
  Object.entries(voteCount).forEach(([decision, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      leadingDecision = decision;
    }
  });

  const percentage = Math.round((maxVotes / review.votes.length) * 100);
  const reached = maxVotes / review.votes.length >= review.consensusThreshold;

  return { reached, decision: leadingDecision, percentage };
}

function getVoteBreakdown(review) {
  const breakdown = {
    approve: 0,
    deny: 0,
    need_info: 0
  };

  review.votes.forEach(vote => {
    if (breakdown.hasOwnProperty(vote.decision)) {
      breakdown[vote.decision]++;
    }
  });

  return breakdown;
}

function finalizeReview(review) {
  const consensus = checkConsensus(review);
  
  if (consensus.reached) {
    review.status = 'completed';
    review.finalDecision = consensus.decision;
    review.completedAt = new Date().toISOString();
    
    // In production, would trigger claim approval/denial
    // and distribute rewards to correct voters
  } else {
    review.status = 'no_consensus';
    // Would escalate to higher review tier
  }
}

module.exports = router;