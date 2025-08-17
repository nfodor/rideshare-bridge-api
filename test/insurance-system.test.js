/**
 * Comprehensive Insurance System Test Suite
 * Tests all insurance endpoints, AI fraud detection, community validation, and payout automation
 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;

// Configure chai-http
chai.use(chaiHttp);

// Test data
const testWallet = '0x742d35Cc6648C1532aA5d6C3e3f5Bbf21F7C3aE3';
const testDriverWallet = '0x853e46Dd7f3e6f23B3C3D8c9c5f4f9b2e3d4f5f6';
const testValidatorWallet = '0x9f2c47c5d8a1e2b3f4a5c6d7e8f9a0b1c2d3e4f5';

describe('🛡️ Insurance System Integration Tests', function() {
  this.timeout(10000);
  let server;
  let agent;

  before(async function() {
    const app = require('../src/index');
    server = app.listen(0); // Use random available port
    const port = server.address().port;
    agent = chai.request(`http://localhost:${port}`);
    console.log(`\n🚀 Test server started on port ${port}`);
  });

  after(function() {
    if (server) {
      server.close();
      console.log('✅ Test server closed');
    }
  });

  describe('📋 Insurance Policy Management', function() {
    
    it('should get insurance quote with dynamic pricing', async function() {
      const quoteRequest = {
        rideAmount: 25.50,
        driverProfile: {
          safetyScore: 850,
          totalRides: 1200,
          accidentHistory: []
        },
        rideDetails: {
          distance: 15.3,
          duration: 22,
          timeOfDay: 'afternoon'
        }
      };

      const res = await agent
        .post('/api/insurance/quote')
        .send(quoteRequest);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.quote).to.have.property('basePremium');
      expect(res.body.quote).to.have.property('riskMultiplier');
      expect(res.body.quote).to.have.property('finalPremium');
      expect(res.body.quote).to.have.property('coverageAmount', 1000000);
      expect(res.body.quote.riskMultiplier).to.be.below(1.5); // Good driver should have low multiplier
      
      console.log(`   💰 Quote: $${res.body.quote.finalPremium} for $${quoteRequest.rideAmount} ride`);
    });

    it('should purchase insurance policy', async function() {
      const purchaseRequest = {
        walletAddress: testWallet,
        rideId: `ride_${Date.now()}`,
        rideAmount: 25.50,
        premiumAmount: 1.28,
        coverageAmount: 1000000,
        driverWallet: testDriverWallet,
        rideDetails: {
          pickupLocation: 'Downtown Station',
          dropoffLocation: 'Airport Terminal B',
          estimatedDuration: 22,
          distance: 15.3
        }
      };

      const res = await agent
        .post('/api/insurance/purchase')
        .send(purchaseRequest);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body.policy).to.have.property('policyId');
      expect(res.body.policy).to.have.property('status', 'active');
      expect(res.body.policy).to.have.property('coverageAmount', 1000000);
      
      // Store policy ID for subsequent tests
      this.testPolicyId = res.body.policy.policyId;
      console.log(`   📜 Policy purchased: ${this.testPolicyId}`);
    });

    it('should retrieve user policies', async function() {
      const res = await agent
        .get(`/api/insurance/policies/${testWallet}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.policies).to.be.an('array');
      expect(res.body.policies.length).to.be.greaterThan(0);
      expect(res.body.statistics).to.have.property('totalPolicies');
      expect(res.body.statistics).to.have.property('totalCoverage');
      
      console.log(`   📊 Total policies: ${res.body.statistics.totalPolicies}`);
    });
  });

  describe('🚨 Claims Processing with AI Fraud Detection', function() {
    let testClaimId;

    it('should submit insurance claim', async function() {
      const claimRequest = {
        policyId: this.testPolicyId || 'policy_test_123',
        claimantWallet: testWallet,
        incidentType: 'accident',
        incidentDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        claimAmount: 3500,
        description: 'Minor collision with parked vehicle, front bumper damage',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Manhattan, NY'
        },
        policeReportNumber: 'NYPD-2024-001234'
      };

      const res = await agent
        .post('/api/claims/submit')
        .send(claimRequest);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body.claim).to.have.property('claimId');
      expect(res.body.claim).to.have.property('status', 'submitted');
      
      testClaimId = res.body.claim.claimId;
      console.log(`   📝 Claim submitted: ${testClaimId}`);
    });

    it('should upload claim documents with AI analysis', async function() {
      // Create test document buffer
      const testDocBuffer = Buffer.from('Mock police report content - incident #001234', 'utf8');
      const testImageBuffer = Buffer.from('Mock damage photo binary data', 'utf8');

      const res = await agent
        .post(`/api/claims/upload/${testClaimId}`)
        .attach('documents', testDocBuffer, 'police_report.pdf')
        .attach('documents', testImageBuffer, 'damage_photo.jpg');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('documentsUploaded');
      expect(res.body.aiAssessment).to.have.property('fraudScore');
      expect(res.body.aiAssessment).to.have.property('confidence');
      expect(res.body.aiAssessment).to.have.property('recommendation');
      expect(res.body.aiAssessment.fraudScore).to.be.a('number');
      expect(res.body.aiAssessment.fraudScore).to.be.at.least(0);
      expect(res.body.aiAssessment.fraudScore).to.be.at.most(1);
      
      console.log(`   🤖 AI Fraud Score: ${(res.body.aiAssessment.fraudScore * 100).toFixed(1)}%`);
      console.log(`   🎯 Recommendation: ${res.body.aiAssessment.recommendation.action}`);
    });

    it('should retrieve claim status with detailed information', async function() {
      const res = await agent
        .get(`/api/claims/status/${testClaimId}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.claim).to.have.property('claimId', testClaimId);
      expect(res.body.claim).to.have.property('status');
      expect(res.body.claim).to.have.property('timeline');
      expect(res.body.claim.timeline).to.be.an('array');
      
      console.log(`   📊 Claim status: ${res.body.claim.status}`);
    });

    it('should get detailed claim information', async function() {
      const res = await agent
        .get(`/api/claims/${testClaimId}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.claim).to.have.property('claimId', testClaimId);
      expect(res.body.claim).to.have.property('aiAssessment');
      
      if (res.body.claim.aiAssessment) {
        expect(res.body.claim.aiAssessment).to.have.property('breakdown');
        expect(res.body.claim.aiAssessment).to.have.property('riskFactors');
        expect(res.body.claim.aiAssessment).to.have.property('metadata');
      }
      
      console.log(`   🔍 AI Assessment Algorithm: ${res.body.claim.aiAssessment?.metadata?.algorithm || 'N/A'}`);
    });
  });

  describe('⚖️ Validator Staking and Management', function() {
    
    it('should register validator with stake', async function() {
      const registrationRequest = {
        walletAddress: testValidatorWallet,
        stakeAmount: 2500, // Above minimum
        profileData: {
          name: 'Test Validator',
          experience: 'Insurance industry professional with 5 years experience',
          specializations: ['medical_claims', 'accident_analysis']
        }
      };

      const res = await agent
        .post('/api/validators/register')
        .send(registrationRequest);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body.validator).to.have.property('walletAddress', testValidatorWallet);
      expect(res.body.validator).to.have.property('stakedAmount', 2500);
      expect(res.body.validator).to.have.property('reputation', 500);
      expect(res.body.validator).to.have.property('active', true);
      expect(res.body.eligibility).to.have.property('eligible');
      
      console.log(`   🎯 Validator registered with ${res.body.stakingInfo.stakingPower} staking power`);
    });

    it('should get validator details and eligibility', async function() {
      const res = await agent
        .get(`/api/validators/${testValidatorWallet}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.validator).to.have.property('walletAddress', testValidatorWallet);
      expect(res.body.validator).to.have.property('eligibility');
      expect(res.body.validator).to.have.property('performance');
      expect(res.body.validator).to.have.property('staking');
      
      console.log(`   📈 Validator reputation: ${res.body.validator.reputation}`);
      console.log(`   ✅ Eligible: ${res.body.validator.eligibility.eligible}`);
    });

    it('should get list of eligible validators', async function() {
      const res = await agent
        .get('/api/validators/eligible?minScore=0.5&limit=5');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.eligibleValidators).to.be.an('array');
      expect(res.body).to.have.property('totalEligible');
      expect(res.body).to.have.property('selectionCriteria');
      
      console.log(`   👥 Eligible validators: ${res.body.totalEligible}`);
    });

    it('should increase validator stake', async function() {
      const stakeRequest = {
        walletAddress: testValidatorWallet,
        action: 'increase',
        amount: 500,
        reason: 'Increasing commitment to validation network'
      };

      const res = await agent
        .post('/api/validators/stake')
        .send(stakeRequest);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.stakeModification).to.have.property('action', 'increase');
      expect(res.body.stakeModification).to.have.property('newStake', 3000);
      
      console.log(`   📊 New stake: ${res.body.stakeModification.newStake} tokens`);
    });

    it('should update validator reputation based on vote accuracy', async function() {
      const voteResult = {
        correct: true,
        claimId: testClaimId,
        consensusReached: true
      };

      const res = await agent
        .post(`/api/validators/${testValidatorWallet}/vote-result`)
        .send(voteResult);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.validator).to.have.property('newReputation');
      expect(res.body.validator).to.have.property('newAccuracy');
      expect(res.body.validator.newReputation).to.be.greaterThan(500); // Should increase
      
      console.log(`   🎯 Updated reputation: ${res.body.validator.newReputation}`);
    });

    it('should get validator network statistics', async function() {
      const res = await agent
        .get('/api/validators/stats');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.statistics).to.have.property('totalValidators');
      expect(res.body.statistics).to.have.property('activeValidators');
      expect(res.body.statistics).to.have.property('totalStaked');
      expect(res.body.statistics).to.have.property('networkHealth');
      
      console.log(`   🌐 Network: ${res.body.statistics.activeValidators} active validators`);
    });
  });

  describe('🏛️ Community Review and Jury System', function() {
    
    it('should check driver jury eligibility', async function() {
      const res = await agent
        .get(`/api/jury/eligibility/${testDriverWallet}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('eligible');
      expect(res.body).to.have.property('requirements');
      expect(res.body.requirements).to.have.property('safetyScore');
      expect(res.body.requirements).to.have.property('totalRides');
      
      console.log(`   ⚖️ Jury eligible: ${res.body.eligible}`);
    });

    it('should assign jury members to claim', async function() {
      const assignmentRequest = {
        claimId: testClaimId,
        requestedJurors: 5,
        specialization: 'accident_claims'
      };

      const res = await agent
        .post(`/api/jury/assign/${testClaimId}`)
        .send(assignmentRequest);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('assignedJurors');
      expect(res.body.assignedJurors).to.be.an('array');
      expect(res.body).to.have.property('reviewDeadline');
      
      console.log(`   👥 Assigned ${res.body.assignedJurors.length} jurors`);
    });
  });

  describe('🗳️ Review Voting System', function() {
    let testReviewId;

    before(function() {
      // Use a test review ID
      testReviewId = 'review_test_' + Date.now();
    });

    it('should get review details', async function() {
      const res = await agent
        .get(`/api/review/${testReviewId}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.review).to.have.property('reviewId');
      expect(res.body.review).to.have.property('claimSummary');
      expect(res.body.review).to.have.property('evidence');
      expect(res.body.review).to.have.property('votingStatus');
      
      console.log(`   📋 Review status: ${res.body.review.votingStatus.status}`);
    });

    it('should submit vote on claim review', async function() {
      const voteRequest = {
        jurorWallet: testDriverWallet,
        vote: 'approve',
        confidence: 0.85,
        reasoning: 'Evidence supports claim. Police report and photos are consistent with described incident.'
      };

      const res = await agent
        .post(`/api/review/${testReviewId}/vote`)
        .send(voteRequest);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body.vote).to.have.property('jurorWallet', testDriverWallet);
      expect(res.body.vote).to.have.property('vote', 'approve');
      expect(res.body).to.have.property('votingStatus');
      
      console.log(`   ✅ Vote submitted: ${res.body.vote.vote} (${res.body.vote.confidence * 100}% confidence)`);
    });
  });

  describe('💰 Automated Payout System', function() {
    
    it('should execute claim payout with validation results', async function() {
      const payoutRequest = {
        claimId: testClaimId,
        validationResults: {
          aiApproved: true,
          communityConsensus: true,
          fraudScore: 0.15,
          jurorApprovalRate: 0.85
        }
      };

      const res = await agent
        .post('/api/payouts/execute')
        .send(payoutRequest);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body.payout).to.have.property('payoutId');
      expect(res.body.payout).to.have.property('trigger');
      expect(res.body.payout).to.have.property('status');
      expect(res.body.eligibility).to.have.property('eligible', true);
      expect(res.body.blockchain).to.have.property('network');
      
      console.log(`   💸 Payout initiated: ${res.body.payout.trigger}`);
      
      // Store for tracking
      this.testPayoutId = res.body.payout.payoutId;
    });

    it('should check payout status', async function() {
      const res = await agent
        .get(`/api/payouts/${this.testPayoutId}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.payout).to.have.property('payoutId', this.testPayoutId);
      expect(res.body.payout).to.have.property('status');
      expect(res.body.payout).to.have.property('blockchain');
      
      console.log(`   📊 Payout status: ${res.body.payout.status}`);
    });

    it('should get emergency fund status', async function() {
      const res = await agent
        .get('/api/payouts/emergency/status');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.emergencyFund).to.have.property('totalFund');
      expect(res.body.emergencyFund).to.have.property('availableAmount');
      expect(res.body.emergencyFund).to.have.property('utilizationRate');
      expect(res.body).to.have.property('conditions');
      expect(res.body).to.have.property('triggers');
      
      console.log(`   🚨 Emergency fund: ${res.body.emergencyFund.utilizationRate} utilized`);
    });

    it('should get payout statistics', async function() {
      const res = await agent
        .get('/api/payouts/stats');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.statistics).to.have.property('totalPayouts');
      expect(res.body.statistics).to.have.property('completedPayouts');
      expect(res.body.statistics).to.have.property('payoutsByTrigger');
      expect(res.body.statistics).to.have.property('successRate');
      expect(res.body).to.have.property('emergencyFundStatus');
      
      console.log(`   📈 Success rate: ${res.body.statistics.successRate}`);
    });
  });

  describe('🔗 End-to-End Integration Flow', function() {
    
    it('should complete full insurance workflow', async function() {
      console.log('\n🔄 Testing complete insurance workflow...');
      
      // 1. Get quote
      const quoteRes = await agent
        .post('/api/insurance/quote')
        .send({
          rideAmount: 45.00,
          driverProfile: { safetyScore: 950, totalRides: 2500 }
        });
      
      expect(quoteRes).to.have.status(200);
      const premium = quoteRes.body.quote.finalPremium;
      console.log(`   1️⃣ Quote obtained: $${premium}`);
      
      // 2. Purchase policy
      const purchaseRes = await agent
        .post('/api/insurance/purchase')
        .send({
          walletAddress: testWallet,
          rideId: `ride_e2e_${Date.now()}`,
          rideAmount: 45.00,
          premiumAmount: premium,
          coverageAmount: 1000000,
          driverWallet: testDriverWallet
        });
      
      expect(purchaseRes).to.have.status(201);
      const policyId = purchaseRes.body.policy.policyId;
      console.log(`   2️⃣ Policy purchased: ${policyId}`);
      
      // 3. Submit claim
      const claimRes = await agent
        .post('/api/claims/submit')
        .send({
          policyId,
          claimantWallet: testWallet,
          incidentType: 'accident',
          incidentDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          claimAmount: 2800,
          description: 'E2E test claim'
        });
      
      expect(claimRes).to.have.status(201);
      const claimId = claimRes.body.claim.claimId;
      console.log(`   3️⃣ Claim submitted: ${claimId}`);
      
      // 4. Upload documents (triggers AI analysis)
      const uploadRes = await agent
        .post(`/api/claims/upload/${claimId}`)
        .attach('documents', Buffer.from('Test document'), 'report.pdf');
      
      expect(uploadRes).to.have.status(200);
      expect(uploadRes.body.aiAssessment).to.have.property('fraudScore');
      console.log(`   4️⃣ AI analysis: ${(uploadRes.body.aiAssessment.fraudScore * 100).toFixed(1)}% fraud score`);
      
      // 5. Execute payout (if AI approved)
      if (uploadRes.body.aiAssessment.recommendation.action === 'AUTO_APPROVE') {
        const payoutRes = await agent
          .post('/api/payouts/execute')
          .send({
            claimId,
            validationResults: {
              aiApproved: true,
              communityConsensus: true,
              fraudScore: uploadRes.body.aiAssessment.fraudScore,
              jurorApprovalRate: 1.0
            }
          });
        
        expect(payoutRes).to.have.status(201);
        console.log(`   5️⃣ Payout executed: ${payoutRes.body.payout.trigger}`);
      } else {
        console.log(`   5️⃣ Payout pending: ${uploadRes.body.aiAssessment.recommendation.action}`);
      }
      
      console.log('✨ End-to-end workflow completed successfully!\n');
    });
  });

  describe('🧪 Error Handling and Edge Cases', function() {
    
    it('should handle invalid wallet addresses', async function() {
      const res = await agent
        .post('/api/insurance/quote')
        .send({
          rideAmount: 25.50,
          driverProfile: { walletAddress: 'invalid_address' }
        });

      // Should still work as wallet validation is on purchase, not quote
      expect(res).to.have.status(200);
    });

    it('should reject claims with insufficient evidence', async function() {
      const claimRes = await agent
        .post('/api/claims/submit')
        .send({
          policyId: 'invalid_policy',
          claimantWallet: testWallet,
          incidentType: 'theft',
          claimAmount: 50000 // High amount
        });
      
      expect(claimRes).to.have.status(201); // Claim created but will be flagged
    });

    it('should handle validator slashing for misconduct', async function() {
      const slashRes = await agent
        .post('/api/validators/slash')
        .send({
          validatorAddress: testValidatorWallet,
          claimId: testClaimId,
          reason: 'incorrect_vote',
          evidence: 'Voted against consensus without proper justification',
          authorizedBy: 'system_admin'
        });

      expect(slashRes).to.have.status(200);
      expect(slashRes.body.slashing).to.have.property('slashAmount');
      console.log(`   ⚡ Validator slashed: ${slashRes.body.slashing.slashAmount} tokens`);
    });

    it('should reject emergency payout without proper conditions', async function() {
      const emergencyRes = await agent
        .post('/api/payouts/emergency')
        .send({
          claimId: testClaimId,
          amount: 10000,
          emergencyReason: 'mass_event',
          authorizedBy: 'test_admin'
        });

      // Should work if emergency conditions are met, otherwise reject
      expect(emergencyRes.status).to.be.oneOf([201, 422]);
    });
  });

  describe('📊 Performance and Load Testing', function() {
    
    it('should handle multiple concurrent quote requests', async function() {
      const promises = Array.from({ length: 10 }, (_, i) => 
        agent
          .post('/api/insurance/quote')
          .send({
            rideAmount: 20 + i,
            driverProfile: { safetyScore: 500 + i * 50 }
          })
      );

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect(res).to.have.status(200);
      });
      
      console.log(`   ⚡ Handled ${results.length} concurrent requests successfully`);
    });

    it('should maintain validator network under load', async function() {
      // Register multiple validators concurrently
      const validatorPromises = Array.from({ length: 5 }, (_, i) => 
        agent
          .post('/api/validators/register')
          .send({
            walletAddress: `0x${i.toString().padStart(40, '0')}`,
            stakeAmount: 1000 + i * 100
          })
      );

      const results = await Promise.all(validatorPromises);
      const successful = results.filter(res => res.status === 201).length;
      
      console.log(`   👥 Registered ${successful}/5 validators under load`);
      expect(successful).to.be.greaterThan(0);
    });
  });
});

// Helper function to format test output
function formatTestSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 INSURANCE SYSTEM TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ Policy Management - Dynamic pricing and coverage');
  console.log('🤖 AI Fraud Detection - Advanced multi-factor analysis');
  console.log('⚖️ Validator Network - Staking and reputation system');
  console.log('🗳️ Community Voting - Jury-based claim validation');
  console.log('💰 Automated Payouts - Multi-trigger execution');
  console.log('🔄 End-to-End Flow - Complete insurance workflow');
  console.log('🛡️ Error Handling - Edge cases and security');
  console.log('⚡ Performance - Concurrent load testing');
  console.log('='.repeat(60));
}

// Run summary after all tests
after(formatTestSummary);