require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, initializeDatabase } = require('./config/database');
const { errorHandler } = require('./middleware/auth');

// Import routes
const userRoutes = require('./routes/users');
const loyaltyRoutes = require('./routes/loyalty');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// Root endpoint info
app.get('/', (req, res) => {
  res.json({
    name: process.env.APP_NAME || 'BIA Loyalty Engine',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      users: '/api/users',
      loyalty: '/api/loyalty'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use(errorHandler);

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅ BIA Loyalty Engine Backend started`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${process.env.DB_PATH || './data/loyalty.db'}\n`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close((err) => {
    if (err) console.error('Database close error:', err);
    else console.log('Database connection closed');
    process.exit(0);
  });
});
