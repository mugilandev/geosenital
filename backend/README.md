# GeoSentinel Backend

Express + SQLite API for the GeoSentinel tourist safety app.

## Setup

```bash
cd backend
npm install
npm run init-db   # Creates database and seeds demo data (optional - auto-runs if DB missing)
npm run dev       # Start server on port 3001
```

## API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/send-otp` | POST | - | Send OTP (user) |
| `/api/auth/verify-otp` | POST | - | Verify OTP, returns JWT |
| `/api/auth/admin/send-otp` | POST | - | Send OTP (admin) |
| `/api/auth/admin/verify-otp` | POST | - | Verify admin OTP |
| `/api/users/profile` | GET/POST | User | Get/save user profile |
| `/api/sos` | POST | User | Create SOS/SUS alert |
| `/api/admin/stats` | GET | Admin | Dashboard stats |
| `/api/admin/users` | GET | Admin | Registered users |
| `/api/admin/sos` | GET | Admin | SOS alerts |
| `/api/admin/feedback` | GET | Admin | User feedback |
| `/api/data/danger-zones` | GET | - | Danger zones |

## Demo OTP

For development, OTPs are logged to the console. Use any 6-digit OTP you see there (or use `123456` after implementing demo bypass for local dev).

**Admin login**: Use phone `9876543210` (or any 10 digits) — OTP will appear in backend console.
