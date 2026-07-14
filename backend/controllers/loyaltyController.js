const { db } = require('../config/database');
const { generateId, calculateTier, getTierMultiplier, getExpiryDate } = require('../utils/helpers');

// Get User Loyalty Dashboard
const getLoyaltyDashboard = (req, res) => {
  const userId = req.user.userId;

  const userQuery = 'SELECT tier, pointsBalance, totalReferrals FROM users WHERE id = ?';
  const transactionQuery = 'SELECT id, description, points, transactionType, expiresAt, createdAt FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50';
  const referralQuery = 'SELECT id, status, pointsAwarded, createdAt, acceptedAt FROM referrals WHERE referrerId = ? ORDER BY createdAt DESC';

  db.get(userQuery, [userId], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Error fetching user data' });
    }

    db.all(transactionQuery, [userId], (err, transactions) => {
      if (err) transactions = [];

      db.all(referralQuery, [userId], (err, referrals) => {
        if (err) referrals = [];

        res.json({
          dashboard: {
            pointsBalance: user.pointsBalance,
            cashValue: user.pointsBalance * 0.25,
            tier: user.tier,
            totalReferrals: user.totalReferrals,
            transactions: transactions || [],
            referrals: referrals || []
          }
        });
      });
    });
  });
};

// Add Points to User
const addPoints = (req, res) => {
  const userId = req.user.userId;
  const { points, description, referenceId, expiresYears } = req.body;

  if (!points || !description) {
    return res.status(400).json({ error: 'Points and description are required' });
  }

  const transactionId = generateId();
  const expiresAt = getExpiryDate(expiresYears || 4);

  const insertTransaction = `
    INSERT INTO transactions (id, userId, description, points, transactionType, referenceId, expiresAt)
    VALUES (?, ?, ?, ?, 'credit', ?, ?)
  `;

  db.run(insertTransaction, [transactionId, userId, description, points, referenceId || null, expiresAt], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error adding points' });
    }

    const updateUser = 'UPDATE users SET pointsBalance = pointsBalance + ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
    db.run(updateUser, [points, userId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating balance' });
      }

      res.json({
        message: 'Points added successfully',
        transactionId,
        newBalance: null // Will be fetched by frontend
      });
    });
  });
};

// Redeem Points
const redeemPoints = (req, res) => {
  const userId = req.user.userId;
  const { points, description } = req.body;

  if (!points || !description) {
    return res.status(400).json({ error: 'Points and description are required' });
  }

  const checkBalance = 'SELECT pointsBalance FROM users WHERE id = ?';
  db.get(checkBalance, [userId], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Error checking balance' });
    }

    if (user.pointsBalance < points) {
      return res.status(400).json({ error: 'Insufficient points balance' });
    }

    const transactionId = generateId();
    const insertTransaction = `
      INSERT INTO transactions (id, userId, description, points, transactionType)
      VALUES (?, ?, ?, ?, 'debit')
    `;

    db.run(insertTransaction, [transactionId, userId, description, -points], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error processing redemption' });
      }

      const updateUser = 'UPDATE users SET pointsBalance = pointsBalance - ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(updateUser, [points, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating balance' });
        }

        res.json({
          message: 'Points redeemed successfully',
          transactionId,
          remainingBalance: user.pointsBalance - points
        });
      });
    });
  });
};

// Get Transaction Ledger
const getTransactionLedger = (req, res) => {
  const userId = req.user.userId;
  const limit = req.query.limit || 100;
  const offset = req.query.offset || 0;

  const query = `
    SELECT id, description, points, transactionType, referenceId, expiresAt, createdAt
    FROM transactions
    WHERE userId = ?
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [userId, limit, offset], (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching ledger' });
    }

    res.json({ transactions: transactions || [] });
  });
};

// Get Referral Link (Generate or Retrieve)
const getReferralLink = (req, res) => {
  const userId = req.user.userId;
  const referralCode = Buffer.from(userId).toString('base64').substring(0, 12).toUpperCase();

  res.json({
    referralCode,
    referralLink: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/refer?code=${referralCode}`
  });
};

// Create Referral
const createReferral = (req, res) => {
  const userId = req.user.userId;
  const { referredEmail } = req.body;

  if (!referredEmail) {
    return res.status(400).json({ error: 'Referred email is required' });
  }

  const referralId = generateId();
  const query = `
    INSERT INTO referrals (id, referrerId, referredEmail, status)
    VALUES (?, ?, ?, 'pending')
  `;

  db.run(query, [referralId, userId, referredEmail], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error creating referral' });
    }

    res.status(201).json({
      message: 'Referral created successfully',
      referralId
    });
  });
};

// Accept Referral (by referred user)
const acceptReferral = (req, res) => {
  const { referralId } = req.body;
  const userId = req.user.userId;

  if (!referralId) {
    return res.status(400).json({ error: 'Referral ID is required' });
  }

  const getReferral = 'SELECT * FROM referrals WHERE id = ?';
  db.get(getReferral, [referralId], (err, referral) => {
    if (err || !referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (referral.status !== 'pending') {
      return res.status(400).json({ error: 'Referral has already been processed' });
    }

    // Award points to referrer
    const referrerQuery = 'SELECT tier FROM users WHERE id = ?';
    db.get(referrerQuery, [referral.referrerId], (err, referrerUser) => {
      if (err || !referrerUser) {
        return res.status(500).json({ error: 'Error fetching referrer' });
      }

      const basePoints = 1000;
      const multiplier = getTierMultiplier(referrerUser.tier);
      const bonusPoints = Math.floor(basePoints * multiplier);

      const transactionId = generateId();
      const insertTransaction = `
        INSERT INTO transactions (id, userId, description, points, transactionType, referenceId, expiresAt)
        VALUES (?, ?, ?, ?, 'credit', ?, ?)
      `;

      db.run(
        insertTransaction,
        [
          transactionId,
          referral.referrerId,
          `Referral Bonus from ${userId}`,
          bonusPoints,
          referralId,
          getExpiryDate(4)
        ],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error awarding referral bonus' });
          }

          // Update referral status
          const updateReferral = 'UPDATE referrals SET status = ?, pointsAwarded = ?, acceptedAt = CURRENT_TIMESTAMP WHERE id = ?';
          db.run(updateReferral, ['accepted', bonusPoints, referralId], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error updating referral status' });
            }

            // Increment referrer's total referrals and update points
            const updateReferrer = `
              UPDATE users
              SET pointsBalance = pointsBalance + ?, totalReferrals = totalReferrals + 1, tier = ?, updatedAt = CURRENT_TIMESTAMP
              WHERE id = ?
            `;

            const newTier = calculateTier(referralUser.totalReferrals + 1);
            db.run(updateReferrer, [bonusPoints, newTier, referral.referrerId], (err) => {
              if (err) {
                return res.status(500).json({ error: 'Error updating referrer' });
              }

              res.json({
                message: 'Referral accepted and bonus awarded',
                bonusPoints
              });
            });
          });
        }
      );
    });
  });
};

module.exports = {
  getLoyaltyDashboard,
  addPoints,
  redeemPoints,
  getTransactionLedger,
  getReferralLink,
  createReferral,
  acceptReferral
};
