const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/index');

describe('Escrow API', () => {
  const validRideData = {
    rideId: 'ride_123',
    riderWallet: '0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e5',
    driverWallet: '0x853e46Dd7f3e6f23B3C3D8c9c5f4f9b2e3d4f5f6',
    amount: '25.50',
    currency: 'ETH'
  };

  const validSignature = '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789ab';

  describe('POST /api/escrow/initiate', () => {
    it('should successfully create an escrow', async () => {
      const response = await request(app)
        .post('/api/escrow/initiate')
        .send(validRideData)
        .expect(201);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('message');
      expect(response.body.escrow).to.include({
        rideId: validRideData.rideId,
        riderWallet: validRideData.riderWallet,
        driverWallet: validRideData.driverWallet,
        amount: validRideData.amount,
        currency: validRideData.currency,
        status: 'active'
      });
      expect(response.body.escrow).to.have.property('escrowAddress');
      expect(response.body.escrow).to.have.property('createdAt');
      expect(response.body.escrow).to.have.property('milestones');
    });

    it('should create escrow with insurance contribution', async () => {
      const dataWithInsurance = {
        ...validRideData,
        rideId: 'ride_124',
        insuranceContribution: '1.0'
      };

      const response = await request(app)
        .post('/api/escrow/initiate')
        .send(dataWithInsurance)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body).to.have.property('insuranceContribution');
      expect(response.body.insuranceContribution).to.include({
        amount: '1.0',
        contributor: dataWithInsurance.riderWallet
      });
    });

    it('should reject duplicate escrow creation', async () => {
      await request(app)
        .post('/api/escrow/initiate')
        .send({ ...validRideData, rideId: 'ride_duplicate' })
        .expect(201);

      const response = await request(app)
        .post('/api/escrow/initiate')
        .send({ ...validRideData, rideId: 'ride_duplicate' })
        .expect(409);

      expect(response.body).to.have.property('error', 'Escrow Already Exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/escrow/initiate')
        .send({ rideId: 'test' })
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation Error');
      expect(response.body).to.have.property('details');
    });

    it('should validate Ethereum addresses', async () => {
      const invalidData = {
        ...validRideData,
        rideId: 'ride_invalid',
        riderWallet: 'invalid_address'
      };

      const response = await request(app)
        .post('/api/escrow/initiate')
        .send(invalidData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation Error');
    });
  });

  describe('GET /api/escrow/status/:rideId', () => {
    before(async () => {
      await request(app)
        .post('/api/escrow/initiate')
        .send({ ...validRideData, rideId: 'ride_status_test' });
    });

    it('should return escrow status', async () => {
      const response = await request(app)
        .get('/api/escrow/status/ride_status_test')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.escrow).to.include({
        rideId: 'ride_status_test',
        status: 'active'
      });
    });

    it('should return 404 for non-existent escrow', async () => {
      const response = await request(app)
        .get('/api/escrow/status/non_existent')
        .expect(404);

      expect(response.body).to.have.property('error');
    });
  });

  describe('POST /api/escrow/release', () => {
    before(async () => {
      await request(app)
        .post('/api/escrow/initiate')
        .send({ ...validRideData, rideId: 'ride_release_test' });
    });

    it('should release escrow with valid signature', async () => {
      const releaseData = {
        rideId: 'ride_release_test',
        signature: validSignature
      };

      const response = await request(app)
        .post('/api/escrow/release')
        .send(releaseData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.escrow).to.include({
        rideId: 'ride_release_test',
        status: 'released'
      });
      expect(response.body.escrow).to.have.property('releasedAt');
    });

    it('should reject release for non-existent escrow', async () => {
      const response = await request(app)
        .post('/api/escrow/release')
        .send({
          rideId: 'non_existent',
          signature: validSignature
        })
        .expect(404);

      expect(response.body).to.have.property('error');
    });
  });

  describe('POST /api/escrow/cancel', () => {
    before(async () => {
      await request(app)
        .post('/api/escrow/initiate')
        .send({ ...validRideData, rideId: 'ride_cancel_test' });
    });

    it('should cancel escrow with valid signature', async () => {
      const cancelData = {
        rideId: 'ride_cancel_test',
        signature: validSignature
      };

      const response = await request(app)
        .post('/api/escrow/cancel')
        .send(cancelData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.escrow).to.include({
        rideId: 'ride_cancel_test',
        status: 'cancelled'
      });
      expect(response.body.escrow).to.have.property('refundAmount');
      expect(response.body.escrow).to.have.property('cancelledAt');
    });
  });
});