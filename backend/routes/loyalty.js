const express = require('express');
const router = express.Router();
const {
  getLoyaltyDashboard,
  addPoints,
  redeemPoints,
  getTransactionLedger,
  getReferralLink,
  createReferral,
  acceptReferral
} = require('../controllers/loyaltyController');
const { authenticateToken } = require('../middleware/auth');

// All loyalty routes require authentication
router.use(authenticateToken);

// Dashboard & Overview
router.get('/dashboard', getLoyaltyDashboard);

// Points Management
router.post('/points/add', addPoints);
router.post('/points/redeem', redeemPoints);

// Ledger & History
router.get('/ledger', getTransactionLedger);

// Referral Management
router.get('/referral-link', getReferralLink);
router.post('/referral/create', createReferral);
router.post('/referral/accept', acceptReferral);

module.exports = router;
