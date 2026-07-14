# Quick Start Guide - BIA Loyalty Backend

## 30 Seconds to Running Server

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

You'll see:
```
✅ BIA Loyalty Engine Backend started
🚀 Server running on http://localhost:5000
📍 Environment: development
💾 Database: ./data/loyalty.db
```

✅ **Done!** Your backend is running.

---

## Test the Backend (In Another Terminal)

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@example.com",
    "password": "SecurePass123!",
    "firstName": "Sarah",
    "lastName": "Al-Mansoori",
    "studentId": "BIA-2024-9042"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Get Loyalty Dashboard (Use token from login)
```bash
curl -X GET http://localhost:5000/api/loyalty/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Add Points
```bash
curl -X POST http://localhost:5000/api/loyalty/points/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "points": 1000,
    "description": "Welcome Bonus",
    "expiresYears": 4
  }'
```

### 5. Check Health
```bash
curl http://localhost:5000/health
```

---

## Connect Frontend to Backend

In your frontend (app.js), update API calls:

```javascript
const API_URL = 'http://localhost:5000/api';

// Register
fetch(`${API_URL}/users/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, firstName, lastName })
})
.then(r => r.json())
.then(data => {
  localStorage.setItem('token', data.token);
  console.log('Logged in!');
});

// Get Dashboard (with auth)
fetch(`${API_URL}/loyalty/dashboard`, {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(data => console.log(data.dashboard));
```

---

## Production Deployment

When ready to deploy to your company's local server:

1. **Read**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. **Choose** option:
   - Option 1: Direct Node.js (simplest)
   - Option 2: Docker (recommended for companies)
   - Option 3: Systemd Service (Linux)

3. **Deploy** in ~5 minutes using the guide

---

## File Structure

```
backend/
├── server.js                    # Main app
├── package.json                # Dependencies
├── .env                         # Configuration
├── config/database.js          # Database setup
├── controllers/                # Business logic
│   ├── userController.js
│   └── loyaltyController.js
├── routes/                     # API endpoints
├── middleware/                 # Auth, error handling
├── utils/helpers.js           # Utility functions
├── data/                       # Database (created at runtime)
├── Dockerfile                 # Docker image
├── docker-compose.yml         # Docker setup
├── README.md                  # Full documentation
└── DEPLOYMENT_GUIDE.md        # Company server setup
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/users/register | ❌ | Create account |
| POST | /api/users/login | ❌ | Login |
| GET | /api/users/profile | ✅ | Get profile |
| PUT | /api/users/profile | ✅ | Update profile |
| GET | /api/loyalty/dashboard | ✅ | Full loyalty info |
| POST | /api/loyalty/points/add | ✅ | Add points |
| POST | /api/loyalty/points/redeem | ✅ | Redeem points |
| GET | /api/loyalty/ledger | ✅ | Transaction history |
| POST | /api/loyalty/referral/create | ✅ | Create referral |
| GET | /health | ❌ | Server health |

---

## Next Steps

1. ✅ Backend running locally
2. ✅ Test API with curl commands above
3. 📝 Update frontend to use new API URLs
4. 🧪 Connect frontend and backend
5. 🚀 Deploy to company server using DEPLOYMENT_GUIDE.md

---

## Need Help?

- **Backend won't start?** Check port 5000 is free: `lsof -i :5000`
- **Database error?** Delete `data/loyalty.db` and restart
- **Frontend can't connect?** Check `CORS_ORIGIN` in `.env`
- **Token errors?** Make sure token is sent in Authorization header

---

**Ready?** Go run `npm run dev` and start testing! 🚀
