const { db } = require('../config/database');
const { generateToken, hashPassword, comparePassword, generateId, calculateTier } = require('../utils/helpers');

// Register User
const registerUser = (req, res) => {
  const { email, password, firstName, lastName, studentId } = req.body;

  // Validate input
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  hashPassword(password).then((hashedPassword) => {
    const userId = generateId();
    const query = `
      INSERT INTO users (id, email, password, firstName, lastName, studentId, tier, pointsBalance)
      VALUES (?, ?, ?, ?, ?, ?, 'Bronze', 0)
    `;

    db.run(query, [userId, email, hashedPassword, firstName, lastName, studentId || null], (err) => {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Error registering user' });
      }

      const token = generateToken(userId, email);
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          userId,
          email,
          firstName,
          lastName,
          tier: 'Bronze',
          pointsBalance: 0
        }
      });
    });
  }).catch((err) => {
    res.status(500).json({ error: 'Error processing password' });
  });
};

// Login User
const loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  db.get(query, [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    comparePassword(password, user.password).then((isMatch) => {
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(user.id, user.email);
      res.json({
        message: 'Login successful',
        token,
        user: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          studentId: user.studentId,
          tier: user.tier,
          pointsBalance: user.pointsBalance,
          totalReferrals: user.totalReferrals
        }
      });
    }).catch((err) => {
      res.status(500).json({ error: 'Error comparing passwords' });
    });
  });
};

// Get User Profile
const getUserProfile = (req, res) => {
  const userId = req.user.userId;
  const query = 'SELECT id, email, firstName, lastName, studentId, tier, pointsBalance, totalReferrals, createdAt FROM users WHERE id = ?';

  db.get(query, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  });
};

// Update User Profile
const updateUserProfile = (req, res) => {
  const userId = req.user.userId;
  const { firstName, lastName, studentId } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and last name are required' });
  }

  const query = 'UPDATE users SET firstName = ?, lastName = ?, studentId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';

  db.run(query, [firstName, lastName, studentId || null, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating profile' });
    }

    res.json({ message: 'Profile updated successfully' });
  });
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile
};
