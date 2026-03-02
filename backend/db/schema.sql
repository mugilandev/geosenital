-- GeoSentinel Database Schema

-- OTP verifications (user and admin)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_or_email TEXT NOT NULL,
  otp TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Admin phones (whitelist for admin login)
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Users (tourists)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT,
  email TEXT,
  name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK(user_type IN ('indian', 'foreigner')),
  identity TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  state TEXT NOT NULL,
  password_hash TEXT,
  lat REAL,
  lng REAL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- SOS alerts (emergency and suspicious)
CREATE TABLE IF NOT EXISTS sos_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('emergency', 'standard')),
  info TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Resolved')),
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Feedback from users
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Danger zones
CREATE TABLE IF NOT EXISTS danger_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'danger' CHECK(type IN ('water', 'danger'))
);
