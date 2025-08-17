const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { claimCreateSchema } = require('../utils/validation');
const AdvancedFraudDetection = require('../services/advanced-fraud-detection');

const router = express.Router();

// Initialize advanced fraud detection service
const fraudDetector = new AdvancedFraudDetection();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and PDF allowed.'));
    }
  }
});

// In-memory storage (would be in database in production)
const claims = new Map();
const claimDocuments = new Map();
const reviews = new Map();

// AI fraud detection simulation
function calculateFraudScore(claim, documents = []) {
  // Simulated AI analysis
  const factors = {
    amountUnusual: parseFloat(claim.claimAmount) > 10000 ? 0.3 : 0,
    timingSuspicious: Math.random() > 0.8 ? 0.2 : 0,
    documentQuality: documents.length < 2 ? 0.2 : 0,
    historicalPattern: Math.random() > 0.9 ? 0.3 : 0
  };
  
  const fraudScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
  const confidence = 0.75 + Math.random() * 0.25; // 75-100% confidence
  
  const redFlags = [];
  if (factors.amountUnusual > 0) redFlags.push('amount_unusual');
  if (factors.timingSuspicious > 0) redFlags.push('timing_suspicious');
  if (factors.documentQuality > 0) redFlags.push('insufficient_documentation');
  if (factors.historicalPattern > 0) redFlags.push('pattern_anomaly');
  
  return {
    fraudScore: Math.min(fraudScore, 1),
    confidence,
    redFlags,
    recommendation: fraudScore < 0.3 ? 'auto_approve' : 
                   fraudScore < 0.7 ? 'community_review' : 'intensive_review'
  };
}

// Create new insurance claim
router.post('/create', async (req, res, next) => {
  try {
    const { error, value } = claimCreateSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { policyId, incidentType, incidentDate, claimAmount, description, claimantWallet } = value;
    const claimId = `claim_${uuidv4()}`;

    const claim = {
      claimId,
      policyId,
      claimantWallet,
      incidentType,
      incidentDate,
      claimAmount,
      description,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      documents: [],
      aiAssessment: null,
      communityReview: null
    };

    claims.set(claimId, claim);

    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      claim: {
        claimId: claim.claimId,
        policyId: claim.policyId,
        status: claim.status,
        submittedAt: claim.submittedAt,
        nextSteps: 'Please upload supporting documents for your claim'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Upload claim documents
router.post('/upload/:claimId', upload.array('documents', 5), async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const claim = claims.get(claimId);

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Claim not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No files uploaded'
      });
    }

    // Process uploaded documents
    const uploadedDocs = req.files.map(file => ({
      documentId: `doc_${uuidv4()}`,
      claimId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date().toISOString(),
      // In production, would store in cloud storage
      content: file.buffer.toString('base64')
    }));

    // Store documents
    uploadedDocs.forEach(doc => {
      claimDocuments.set(doc.documentId, doc);
      claim.documents.push(doc.documentId);
    });

    // Run advanced AI assessment after document upload
    const aiAssessment = await fraudDetector.calculateAdvancedFraudScore(
      claim, 
      uploadedDocs,
      { claims: [], transactionHistory: [] }, // Mock driver history
      { weather: { conditions: 'clear' }, mapping: { valid: true } } // Mock external data
    );
    claim.aiAssessment = aiAssessment;
    claim.status = 'processing';

    // Determine if community review is needed
    if (aiAssessment.recommendation.action === 'COMMUNITY_REVIEW' || 
        aiAssessment.recommendation.action === 'MANUAL_REVIEW') {
      // Create community review
      const reviewId = `review_${uuidv4()}`;
      const review = {
        reviewId,
        claimId,
        aiAssessment,
        jurors: [], // Would be selected from eligible drivers
        votes: [],
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
        status: 'pending_jurors',
        consensusThreshold: 0.66
      };
      reviews.set(reviewId, review);
      claim.communityReview = reviewId;
    }

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      claimId,
      documentsUploaded: uploadedDocs.length,
      aiAssessment: {
        fraudScore: (aiAssessment.fraudScore * 100).toFixed(0) + '%',
        confidence: (aiAssessment.confidence * 100).toFixed(0) + '%',
        recommendation: aiAssessment.recommendation,
        requiresCommunityReview: aiAssessment.recommendation !== 'auto_approve'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get claim status
router.get('/:claimId', async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const claim = claims.get(claimId);

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Claim not found'
      });
    }

    // Get review status if applicable
    let reviewStatus = null;
    if (claim.communityReview) {
      const review = reviews.get(claim.communityReview);
      if (review) {
        reviewStatus = {
          reviewId: review.reviewId,
          status: review.status,
          jurorsAssigned: review.jurors.length,
          votesReceived: review.votes.length,
          deadline: review.deadline
        };
      }
    }

    res.json({
      success: true,
      claim: {
        claimId: claim.claimId,
        policyId: claim.policyId,
        status: claim.status,
        incidentType: claim.incidentType,
        incidentDate: claim.incidentDate,
        claimAmount: claim.claimAmount,
        submittedAt: claim.submittedAt,
        documentsCount: claim.documents.length,
        aiAssessment: claim.aiAssessment ? {
          fraudScore: (claim.aiAssessment.fraudScore * 100).toFixed(0) + '%',
          recommendation: claim.aiAssessment.recommendation,
          redFlags: claim.aiAssessment.redFlags
        } : null,
        communityReview: reviewStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

// Process claim (AI endpoint)
router.post('/process', async (req, res, next) => {
  try {
    const { claimId } = req.body;
    
    if (!claimId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'claimId is required'
      });
    }

    const claim = claims.get(claimId);
    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Claim not found'
      });
    }

    // Re-run AI assessment
    const documents = claim.documents.map(docId => claimDocuments.get(docId));
    const aiAssessment = calculateFraudScore(claim, documents);
    claim.aiAssessment = aiAssessment;

    // Auto-approve if low risk
    if (aiAssessment.recommendation === 'auto_approve' && 
        parseFloat(claim.claimAmount) < 1000) {
      claim.status = 'approved';
      claim.approvedAt = new Date().toISOString();
      claim.approvalMethod = 'ai_auto_approve';
    } else {
      claim.status = 'awaiting_review';
    }

    res.json({
      success: true,
      message: 'Claim processed',
      claimId,
      status: claim.status,
      aiAssessment: {
        fraudScore: (aiAssessment.fraudScore * 100).toFixed(0) + '%',
        confidence: (aiAssessment.confidence * 100).toFixed(0) + '%',
        recommendation: aiAssessment.recommendation,
        redFlags: aiAssessment.redFlags
      },
      nextSteps: claim.status === 'approved' ? 
        'Claim approved. Payment will be processed within 24 hours.' :
        'Claim requires community review. Jurors will be assigned shortly.'
    });
  } catch (error) {
    next(error);
  }
});

// Get claims by wallet
router.get('/wallet/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    const walletClaims = Array.from(claims.values()).filter(
      claim => claim.claimantWallet.toLowerCase() === address.toLowerCase()
    );

    res.json({
      success: true,
      wallet: address,
      totalClaims: walletClaims.length,
      claims: walletClaims.map(claim => ({
        claimId: claim.claimId,
        policyId: claim.policyId,
        status: claim.status,
        incidentType: claim.incidentType,
        claimAmount: claim.claimAmount,
        submittedAt: claim.submittedAt,
        aiRecommendation: claim.aiAssessment?.recommendation || null
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;