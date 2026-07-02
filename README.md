# SecureX — Adaptive Authentication System

A backend authentication system built with **Node.js**, **Express.js**, and **MongoDB** that goes beyond basic login/logout. SecureX implements a multi-signal risk engine, real-time session hijack detection, and layered security hardening to protect user sessions intelligently.

> 🖥️ **Frontend dashboard coming soon** — currently backend-only with a minimal testing interface.

---

## Features

### 🔐 Risk-Based Authentication Engine
- Computes a **risk score per login attempt** using 3 signals: device ID, SHA-256 hashed device fingerprint, and session state
- Low-risk logins proceed normally; high-risk logins (score ≥ 50) trigger an **OTP verification flow** before access is granted
- Trusted devices are remembered and verified on each subsequent login

### 🚨 Real-Time Session Hijack Detection
- Every request is validated against the **JWT token's embedded device ID and fingerprint**
- Any mismatch (token stolen, replayed on a different device) immediately:
  - Revokes **all active sessions** for that user
  - Sets a `suspiciousLogin` flag on the account
  - Emits a live **`HIJACK_ATTEMPT` WebSocket event** via Socket.IO to alert the dashboard in real time

### 🔑 JWT Session Management
- Access tokens expire in **15 minutes** and are stored in `httpOnly` cookies (not localStorage) to prevent XSS theft
- Each session is tied to a specific **device ID + fingerprint pair** and tracked in MongoDB
- Logout clears only the current device session; admins can revoke any specific device remotely

### 🛡️ Layered Security Hardening
- **bcrypt** password hashing (salt rounds: 10)
- **Rate limiting** — max 5 login attempts per minute per IP via `express-rate-limit`
- **Account lockout** — 15-minute lock after 5 consecutive failed login attempts
- **Helmet.js** — sets secure HTTP response headers across all routes
- **CORS** configured for trusted origin only

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Mongoose) |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| Real-time | Socket.IO |
| Security | Helmet.js, express-rate-limit, crypto (SHA-256) |
| Session storage | HTTP-only cookies |

---

## API Routes

### Auth Routes — `/api/auth`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| POST | `/signup` | Register a new user | No |
| POST | `/login` | Login with risk scoring | Rate limited |
| POST | `/verify-device` | Submit OTP for unrecognised device | Rate limited |
| POST | `/logout` | Logout current device session | Yes |
| GET | `/trusted-devices` | List all trusted devices | Yes |
| POST | `/revoke-device` | Revoke a specific device session | Yes |
| GET | `/secure-dashboard` | Protected route (auth check) | Yes |

### User Routes — `/api/user`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| GET | `/me` | Get current user info + risk score | Yes |

---

## How the Risk Engine Works

```
Login attempt received
        │
        ▼
Is device ID known? ──No──► +50 risk score
        │
       Yes
        │
        ▼
Does fingerprint match? ──No──► +25 risk score
        │
       Yes
        │
        ▼
Risk score ≥ 50? ──Yes──► Send OTP → require verification
        │
       No
        │
        ▼
Trust device + issue JWT + create session
```

---

## How Hijack Detection Works

```
Authenticated request received
        │
        ▼
Verify JWT signature + expiry
        │
        ▼
Compare token's deviceId + fingerprint
with request headers
        │
     Mismatch? ──Yes──► Revoke ALL sessions
        │                + Set suspiciousLogin = true
        │                + Emit HIJACK_ATTEMPT via Socket.IO
        │                + Return 401
       No
        │
        ▼
Check session exists in MongoDB
and has not expired
        │
        ▼
Attach user to request → proceed
```

---

## Project Structure

```
SecureX/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── authController.js     # signup, login, OTP verify, logout, device management
│   └── userController.js     # getCurrentUser
├── middleware/
│   ├── authMiddleware.js     # JWT validation + hijack detection + Socket.IO alerts
│   └── rateLimiter.js        # express-rate-limit config (5 req/min)
├── models/
│   └── User.js               # User schema with sessions, trusted devices, risk fields
├── routes/
│   ├── authRoutes.js         # Auth route definitions
│   └── userRoutes.js         # User route definitions
├── app.js                    # Express app setup, middleware, CORS, Helmet
├── server.js                 # HTTP server + Socket.IO setup
└── .env                      # Environment variables (not committed)
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/visheshp5/SecureX.git
cd SecureX

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start the server
npm start
```

Server runs on `http://localhost:5000`

---

## Security Design Decisions

**Why `httpOnly` cookies instead of localStorage?**
localStorage is accessible via JavaScript, making it vulnerable to XSS attacks. `httpOnly` cookies are invisible to client-side scripts — the browser sends them automatically but JS cannot read or steal them.

**Why SHA-256 for device fingerprinting?**
The raw fingerprint string could contain sensitive device metadata. Hashing it with SHA-256 before storing means the database never holds raw fingerprint data — only a fixed-length digest that can be compared but not reversed.

**Why `Promise.allSettled()` pattern (stateless JWT)?**
JWTs are stateless by design — any server can validate them without a shared session store. This is intentional: it means the auth system can scale horizontally without sticky sessions or a centralised session database.

**Why 15-minute JWT expiry?**
Short expiry limits the damage window if a token is stolen. Combined with `httpOnly` cookie storage and per-device session tracking in MongoDB, this creates defence-in-depth — even a stolen token expires quickly and is tied to a specific device fingerprint.

---

## Roadmap

- [ ] Frontend dashboard with real-time security alerts (Socket.IO)
- [ ] Refresh token rotation
- [ ] Email delivery for OTP (currently logged to console)
- [ ] Geolocation-based risk scoring
- [ ] Admin panel for session management across all users
- [ ] Docker support

---

## Author

**Vishesh Pandey**
[GitHub](https://github.com/visheshp5) · [LinkedIn](https://linkedin.com/in/vishesh-pandey-119549326) · [LeetCode](https://leetcode.com/u/Visheshp_05)
