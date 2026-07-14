## API Reference

Complete API documentation for BIA Loyalty Engine Backend.

---

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## User Management

### Register User
**POST** `/users/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "studentId": "BIA-2024-1234"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tier": "Bronze",
    "pointsBalance": 0
  }
}
```

**Errors:**
- 400: Missing required fields
- 409: Email already exists

---

### Login User
**POST** `/users/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "studentId": "BIA-2024-1234",
    "tier": "Gold",
    "pointsBalance": 5000,
    "totalReferrals": 8
  }
}
```

**Errors:**
- 400: Missing email or password
- 401: Invalid credentials

---

### Get User Profile
**GET** `/users/profile` ✅ Protected

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "studentId": "BIA-2024-1234",
    "tier": "Gold",
    "pointsBalance": 5000,
    "totalReferrals": 8,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Update User Profile
**PUT** `/users/profile` ✅ Protected

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "studentId": "BIA-2024-5678"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully"
}
```

---

## Loyalty Management

### Get Loyalty Dashboard
**GET** `/loyalty/dashboard` ✅ Protected

**Response (200 OK):**
```json
{
  "dashboard": {
    "pointsBalance": 5000,
    "cashValue": 1250,
    "tier": "Gold",
    "totalReferrals": 8,
    "transactions": [
      {
        "id": "txn-001",
        "description": "Referral Bonus from John Smith",
        "points": 1000,
        "transactionType": "credit",
        "expiresAt": "2028-01-15",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "referrals": [
      {
        "id": "ref-001",
        "status": "accepted",
        "pointsAwarded": 1000,
        "createdAt": "2024-01-10T08:00:00Z",
        "acceptedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

### Add Points
**POST** `/loyalty/points/add` ✅ Protected

**Request Body:**
```json
{
  "points": 1000,
  "description": "Referral Welcome Bonus",
  "referenceId": "REF-BIA-001",
  "expiresYears": 4
}
```

**Response (200 OK):**
```json
{
  "message": "Points added successfully",
  "transactionId": "txn-550e8400-e29b-41d4-a716-446655440000",
  "newBalance": null
}
```

---

### Redeem Points
**POST** `/loyalty/points/redeem` ✅ Protected

**Request Body:**
```json
{
  "points": 500,
  "description": "Redeemed for AED 125 voucher"
}
```

**Response (200 OK):**
```json
{
  "message": "Points redeemed successfully",
  "transactionId": "txn-550e8400-e29b-41d4-a716-446655440000",
  "remainingBalance": 4500
}
```

**Errors:**
- 400: Insufficient points balance

---

### Get Transaction Ledger
**GET** `/loyalty/ledger?limit=50&offset=0` ✅ Protected

**Query Parameters:**
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "txn-001",
      "description": "Referral Bonus from John Smith",
      "points": 1000,
      "transactionType": "credit",
      "referenceId": "ref-001",
      "expiresAt": "2028-01-15",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "txn-002",
      "description": "Redeemed for AED 250 voucher",
      "points": -1000,
      "transactionType": "debit",
      "referenceId": null,
      "expiresAt": null,
      "createdAt": "2024-01-20T14:45:00Z"
    }
  ]
}
```

---

## Referral Management

### Get Referral Link
**GET** `/loyalty/referral-link` ✅ Protected

**Response (200 OK):**
```json
{
  "referralCode": "NTUwZTg0MDA",
  "referralLink": "http://localhost:3000/refer?code=NTUwZTg0MDA"
}
```

---

### Create Referral
**POST** `/loyalty/referral/create` ✅ Protected

**Request Body:**
```json
{
  "referredEmail": "friend@example.com"
}
```

**Response (201 Created):**
```json
{
  "message": "Referral created successfully",
  "referralId": "ref-550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Accept Referral
**POST** `/loyalty/referral/accept` ✅ Protected

Called by the person being referred to accept the referral and award points to referrer.

**Request Body:**
```json
{
  "referralId": "ref-550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "message": "Referral accepted and bonus awarded",
  "bonusPoints": 1100
}
```

**Errors:**
- 404: Referral not found
- 400: Referral already processed

---

## Health & System

### Health Check
**GET** `/health`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T15:30:45.123Z",
  "uptime": 3600.5
}
```

---

### API Info
**GET** `/` (root)

**Response (200 OK):**
```json
{
  "name": "BIA Loyalty Engine",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "users": "/api/users",
    "loyalty": "/api/loyalty"
  }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Token expired |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Email already exists |
| 500 | Server Error - Backend issue |

---

## Error Responses

**400 Bad Request:**
```json
{
  "error": "All fields are required"
}
```

**401 Unauthorized:**
```json
{
  "error": "Access token required"
}
```

**403 Forbidden:**
```json
{
  "error": "Invalid or expired token"
}
```

**409 Conflict:**
```json
{
  "error": "Email already exists"
}
```

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### Protected Request (Replace TOKEN)
```bash
TOKEN="your_token_here"
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## Tier Information

| Tier | Min Referrals | Points Multiplier | Cashback Cap |
|------|---------------|-------------------|--------------|
| Bronze | 0 | 1.0x | 30% |
| Silver | 3 | 1.1x | 35% |
| Gold | 5 | 1.2x | 40% |
| Platinum | 15 | 1.3x | 40% |

---

## Rate Limiting

Currently no rate limiting is implemented. Recommended for production:
- 100 requests/minute per IP for public endpoints
- 1000 requests/minute per user for authenticated endpoints

---

## Version History

- **1.0.0** (Current) - Initial production release

---

Last Updated: 2024
