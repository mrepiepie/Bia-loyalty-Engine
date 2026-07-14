const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/loyalty.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database:', dbPath);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize database schema
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users Table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          studentId TEXT UNIQUE,
          tier TEXT DEFAULT 'Bronze',
          pointsBalance INTEGER DEFAULT 0,
          totalReferrals INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating users table:', err);
      });

      // Loyalty Transactions (Ledger) Table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          description TEXT NOT NULL,
          points INTEGER NOT NULL,
          transactionType TEXT NOT NULL,
          referenceId TEXT,
          expiresAt DATE,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error('Error creating transactions table:', err);
      });

      // Referrals Table
      db.run(`
        CREATE TABLE IF NOT EXISTS referrals (
          id TEXT PRIMARY KEY,
          referrerId TEXT NOT NULL,
          referredEmail TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          pointsAwarded INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          acceptedAt DATETIME,
          FOREIGN KEY (referrerId) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error('Error creating referrals table:', err);
      });

      // Tier Milestones Table
      db.run(`
        CREATE TABLE IF NOT EXISTS milestones (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          referralThreshold INTEGER NOT NULL,
          rewardPoints INTEGER NOT NULL,
          unlockedAt DATETIME,
          isUnlocked BOOLEAN DEFAULT 0,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(userId, referralThreshold)
        )
      `, (err) => {
        if (err) console.error('Error creating milestones table:', err);
        else {
          console.log('Database schema initialized successfully');
          resolve();
        }
      });
    });
  });
};

module.exports = { db, initializeDatabase };
