# BIA Loyalty Engine Backend

Production-ready Node.js + Express backend for the BIA Loyalty Simulator application.

## Features

- **JWT Authentication** - Secure token-based authentication
- **SQLite Database** - Zero-configuration file-based database
- **RESTful API** - Clean, organized endpoints
- **User Management** - Registration, login, profile management
- **Loyalty System** - Points management, referrals, tier system, transaction ledger
- **Error Handling** - Comprehensive error handling and validation
- **CORS Support** - Configured for local development
- **Easily Deployable** - Docker support for company servers

## Quick Start

### Installation

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

The server will start on `http://localhost:5000`

## Environment Configuration

Edit `.env` file to customize:

```
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_in_production_min_32_chars
JWT_EXPIRE=7d
DB_PATH=./data/loyalty.db
CORS_ORIGIN=http://localhost:3000
APP_NAME=BIA Loyalty Engine
```

**IMPORTANT for Production:**
- Change `JWT_SECRET` to a strong random string (min 32 characters)
- Set `NODE_ENV=production`
- Update `CORS_ORIGIN` to your actual frontend URL

## API Endpoints

### User Authentication

**POST** `/api/users/register`
- Register a new user
- Body: `{ email, password, firstName, lastName, studentId? }`

**POST** `/api/users/login`
- Login user
- Body: `{ email, password }`
- Returns: JWT token

**GET** `/api/users/profile` (Protected)
- Get logged-in user profile

**PUT** `/api/users/profile` (Protected)
- Update user profile
- Body: `{ firstName, lastName, studentId? }`

### Loyalty Management

**GET** `/api/loyalty/dashboard` (Protected)
- Get complete loyalty dashboard with points, tier, referrals, and transactions

**POST** `/api/loyalty/points/add` (Protected)
- Add points to user account
- Body: `{ points, description, referenceId?, expiresYears? }`

**POST** `/api/loyalty/points/redeem` (Protected)
- Redeem points from user account
- Body: `{ points, description }`

**GET** `/api/loyalty/ledger` (Protected)
- Get transaction history
- Query params: `limit=100&offset=0`

**GET** `/api/loyalty/referral-link` (Protected)
- Get user's referral code and link

**POST** `/api/loyalty/referral/create` (Protected)
- Create a referral
- Body: `{ referredEmail }`

**POST** `/api/loyalty/referral/accept` (Protected)
- Accept a referral and award points
- Body: `{ referralId }`

### Health Check

**GET** `/health`
- Returns server health status

**GET** `/`
- Returns API information

## Database Schema

### users
- id (UUID)
- email (unique)
- password (hashed)
- firstName, lastName
- studentId
- tier (Bronze/Silver/Gold/Platinum)
- pointsBalance
- totalReferrals
- createdAt, updatedAt

### transactions
- id (UUID)
- userId
- description
- points
- transactionType (credit/debit)
- referenceId
- expiresAt
- createdAt

### referrals
- id (UUID)
- referrerId
- referredEmail
- status (pending/accepted)
- pointsAwarded
- createdAt, acceptedAt

### milestones
- id (UUID)
- userId
- referralThreshold
- rewardPoints
- isUnlocked
- unlockedAt

## Tier System

| Tier | Referrals | Points Multiplier | Cashback Cap |
|------|-----------|-------------------|--------------|
| Bronze | 0-2 | 1.0x | 30% |
| Silver | 3-4 | 1.1x | 35% |
| Gold | 5-14 | 1.2x | 40% |
| Platinum | 15+ | 1.3x | 40% |

## Docker Deployment

### Using Docker

```bash
# Build Docker image
docker build -t bia-loyalty-backend .

# Run container
docker run -p 5000:5000 --env-file .env bia-loyalty-backend
```

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

Database will be persisted in `data/` folder.

## Project Structure

```
backend/
├── server.js                 # Main entry point
├── package.json             # Dependencies
├── .env                     # Configuration
├── config/
│   └── database.js          # SQLite setup
├── routes/
│   ├── users.js            # User endpoints
│   └── loyalty.js          # Loyalty endpoints
├── controllers/
│   ├── userController.js   # User logic
│   └── loyaltyController.js # Loyalty logic
├── middleware/
│   └── auth.js            # JWT & error handling
├── utils/
│   └── helpers.js         # Utility functions
├── data/                  # Database files (created at runtime)
├── Dockerfile            # Docker configuration
└── docker-compose.yml    # Multi-container setup
```

## Development

### Running Tests

```bash
npm test
```

### Development with Auto-Reload

```bash
npm run dev
```

Uses `nodemon` to automatically restart on file changes.

## Security Notes

1. ✅ Passwords are hashed using bcryptjs
2. ✅ JWT tokens expire after 7 days
3. ✅ CORS is configured for local development
4. ✅ SQL injection protection via parameterized queries
5. ⚠️ Change JWT_SECRET in production
6. ⚠️ Use HTTPS in production
7. ⚠️ Set NODE_ENV=production

## Troubleshooting

### Database file not created
- Ensure `data/` folder has write permissions
- Check `DB_PATH` in `.env`

### JWT errors
- Verify JWT_SECRET is set in `.env`
- Check token format in Authorization header: `Bearer <token>`

### CORS errors
- Update `CORS_ORIGIN` in `.env` to match frontend URL

### Port already in use
- Change `PORT` in `.env`
- Or kill existing process: `lsof -i :5000`

## Performance Tips

- SQLite is optimized for local/small-scale deployments
- For larger deployments, consider PostgreSQL
- Database queries are indexed for tier and email lookups
- Foreign keys enabled for data integrity

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] User roles (admin, moderator)
- [ ] Analytics endpoints
- [ ] Automated point expiry
- [ ] Email notifications
- [ ] Rate limiting
- [ ] API documentation (Swagger)

## Support

For issues or questions, contact your development team.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready ✅
