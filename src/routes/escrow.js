const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createBlockchainService } = require('../utils/blockchain-factory');
const { escrowInitiateSchema, escrowActionSchema } = require('../utils/validation');

const router = express.Router();
const blockchainService = createBlockchainService();

router.post('/initiate', async (req, res, next) => {
  try {
    const { error, value } = escrowInitiateSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { rideId, riderWallet, driverWallet, amount, currency, insuranceContribution, referrerId } = value;

    const existingEscrow = await blockchainService.getEscrow(rideId);
    if (existingEscrow) {
      return res.status(409).json({
        error: 'Escrow Already Exists',
        message: `Escrow for ride ${rideId} already exists`,
        escrowAddress: existingEscrow.escrowAddress
      });
    }

    const escrow = await blockchainService.createEscrow(
      rideId,
      riderWallet,
      driverWallet,
      amount,
      currency
    );

    let insuranceContrib = null;
    if (insuranceContribution) {
      insuranceContrib = await blockchainService.contributeToInsurance(
        riderWallet,
        insuranceContribution
      );
    }

    const response = {
      success: true,
      message: 'Escrow initiated successfully',
      escrow: {
        rideId: escrow.rideId,
        escrowAddress: escrow.escrowAddress,
        riderWallet: escrow.riderWallet,
        driverWallet: escrow.driverWallet,
        amount: escrow.amount,
        currency: escrow.currency,
        status: escrow.status,
        createdAt: escrow.createdAt,
        milestones: escrow.milestones
      },
      ...(insuranceContrib && {
        insuranceContribution: {
          amount: insuranceContrib.amount,
          transactionHash: insuranceContrib.transactionHash,
          contributor: insuranceContrib.contributor
        }
      }),
      ...(referrerId && { referrerId })
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/release', async (req, res, next) => {
  try {
    const { error, value } = escrowActionSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { rideId, signature } = value;

    const escrow = await blockchainService.getEscrow(rideId);
    if (!escrow) {
      const notFoundError = new Error('Escrow not found');
      notFoundError.code = 'ESCROW_NOT_FOUND';
      return next(notFoundError);
    }

    const message = `Release escrow for ride ${rideId}`;
    const isValidSignature = await blockchainService.validateSignature(
      message,
      signature,
      escrow.driverWallet
    );

    if (!isValidSignature) {
      return res.status(401).json({
        error: 'Invalid Signature',
        message: 'Signature validation failed. Only the driver can release escrow.'
      });
    }

    const releasedEscrow = await blockchainService.releaseEscrow(rideId, signature);

    res.json({
      success: true,
      message: 'Escrow released successfully',
      escrow: {
        rideId: releasedEscrow.rideId,
        escrowAddress: releasedEscrow.escrowAddress,
        amount: releasedEscrow.amount,
        currency: releasedEscrow.currency,
        status: releasedEscrow.status,
        releasedAt: releasedEscrow.releasedAt,
        driverWallet: releasedEscrow.driverWallet,
        milestones: releasedEscrow.milestones
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    const { error, value } = escrowActionSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { rideId, signature } = value;

    const escrow = await blockchainService.getEscrow(rideId);
    if (!escrow) {
      const notFoundError = new Error('Escrow not found');
      notFoundError.code = 'ESCROW_NOT_FOUND';
      return next(notFoundError);
    }

    const message = `Cancel escrow for ride ${rideId}`;
    const isValidRiderSignature = await blockchainService.validateSignature(
      message,
      signature,
      escrow.riderWallet
    );
    const isValidDriverSignature = await blockchainService.validateSignature(
      message,
      signature,
      escrow.driverWallet
    );

    if (!isValidRiderSignature && !isValidDriverSignature) {
      return res.status(401).json({
        error: 'Invalid Signature',
        message: 'Signature validation failed. Only the rider or driver can cancel escrow.'
      });
    }

    const cancelledEscrow = await blockchainService.cancelEscrow(rideId, signature);

    res.json({
      success: true,
      message: 'Escrow cancelled successfully',
      escrow: {
        rideId: cancelledEscrow.rideId,
        escrowAddress: cancelledEscrow.escrowAddress,
        amount: cancelledEscrow.amount,
        refundAmount: cancelledEscrow.refundAmount,
        currency: cancelledEscrow.currency,
        status: cancelledEscrow.status,
        cancelledAt: cancelledEscrow.cancelledAt,
        milestones: cancelledEscrow.milestones
      },
      note: 'Insurance contributions are non-refundable'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/status/:rideId', async (req, res, next) => {
  try {
    const { rideId } = req.params;

    const escrow = await blockchainService.getEscrow(rideId);
    if (!escrow) {
      const notFoundError = new Error('Escrow not found');
      notFoundError.code = 'ESCROW_NOT_FOUND';
      return next(notFoundError);
    }

    res.json({
      success: true,
      escrow: {
        rideId: escrow.rideId,
        escrowAddress: escrow.escrowAddress,
        riderWallet: escrow.riderWallet,
        driverWallet: escrow.driverWallet,
        amount: escrow.amount,
        currency: escrow.currency,
        status: escrow.status,
        createdAt: escrow.createdAt,
        milestones: escrow.milestones,
        ...(escrow.releasedAt && { releasedAt: escrow.releasedAt }),
        ...(escrow.cancelledAt && { cancelledAt: escrow.cancelledAt }),
        ...(escrow.refundAmount && { refundAmount: escrow.refundAmount })
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;