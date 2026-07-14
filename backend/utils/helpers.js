const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Generate JWT Token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate UUID
const generateId = () => {
  return uuidv4();
};

// Calculate tier based on referral count
const calculateTier = (referralCount) => {
  if (referralCount >= 15) return 'Platinum';
  if (referralCount >= 5) return 'Gold';
  if (referralCount >= 3) return 'Silver';
  return 'Bronze';
};

// Get tier multiplier for points
const getTierMultiplier = (tier) => {
  const multipliers = {
    'Bronze': 1.0,
    'Silver': 1.1,
    'Gold': 1.2,
    'Platinum': 1.3
  };
  return multipliers[tier] || 1.0;
};

// Get tier cap for cashback
const getTierCap = (tier) => {
  const caps = {
    'Bronze': 0.30,
    'Silver': 0.35,
    'Gold': 0.40,
    'Platinum': 0.40
  };
  return caps[tier] || 0.30;
};

// Format points with commas
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Get expiry date string (years from now)
const getExpiryDate = (yearsToAdd = 4) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsToAdd);
  return d.toISOString().split('T')[0];
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  generateId,
  calculateTier,
  getTierMultiplier,
  getTierCap,
  formatNumber,
  getExpiryDate
};
