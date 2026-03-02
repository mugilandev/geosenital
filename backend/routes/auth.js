import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db/index.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "geosentinel-dev-secret-change-in-prod";

// ── Helpers ────────────────────────────────────────────────────────────────

function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "geosentinel_salt").digest("hex");
}

// ── USER: Sign Up (phone + password + profile in one shot) ─────────────────

// POST /api/auth/signup
router.post("/signup", (req, res) => {
  try {
    const { phone, region, password, name, userType, identity, emergencyContact, state } = req.body;
    if (!phone || !password || !name || !userType || !identity || !emergencyContact || !state) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const fullPhone = (region || "+91") + String(phone).replace(/\D/g, "");
    const hashed = hashPassword(password);

    // Check if user already exists
    const existing = db.prepare("SELECT id FROM users WHERE phone = ?").get(fullPhone);
    if (existing) {
      return res.status(409).json({ error: "Phone number already registered. Please log in." });
    }

    // Insert new user with password_hash
    const r = db.prepare(
      "INSERT INTO users (phone, name, user_type, identity, emergency_contact, state, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(fullPhone, name, userType, identity.replace(/\s/g, ""), emergencyContact, state, hashed);

    const token = jwt.sign(
      { sub: fullPhone, role: "user", method: "phone", value: phone },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[SIGNUP] New user registered: ${fullPhone} (${name})`);
    res.json({ success: true, token, role: "user", userId: r.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sign up failed: " + e.message });
  }
});

// POST /api/auth/login  (phone + password)
router.post("/login", (req, res) => {
  try {
    const { phone, region, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: "Phone and password are required" });
    }

    const fullPhone = (region || "+91") + String(phone).replace(/\D/g, "");
    const hashed = hashPassword(password);

    const user = db.prepare(
      "SELECT id, name, user_type, password_hash FROM users WHERE phone = ?"
    ).get(fullPhone);

    if (!user) {
      return res.status(401).json({ error: "Phone number not found. Please sign up first." });
    }
    if (user.password_hash !== hashed) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    const token = jwt.sign(
      { sub: fullPhone, role: "user", method: "phone", value: phone },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[LOGIN] User logged in: ${fullPhone} (${user.name})`);
    res.json({
      success: true,
      token,
      role: "user",
      userId: user.id,
      name: user.name,
      userType: user.user_type,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── ADMIN: Phone → Gmail → Password ───────────────────────────────────────

// In-memory admin store — pre-seeded with registered admin account
const adminAccounts = new Map([
  ["8148693484", { gmail: "mugilans2401@gmail.com", password: "24012008" }],
]);

// POST /api/auth/admin/check-phone  — step 1: verify phone exists
router.post("/admin/check-phone", (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone required" });

    const digits = String(phone).replace(/\D/g, "");
    const phoneDigits = digits.slice(-10); // last 10 digits

    // Check DB admins table OR in-memory map
    const dbAdmin = db.prepare("SELECT id FROM admins WHERE phone = ?").get(phoneDigits);
    const memAdmin = adminAccounts.has(phoneDigits);

    if (!dbAdmin && !memAdmin) {
      // For demo: allow any 10-digit phone to register as admin
      // We'll auto-create an in-memory entry with default credentials
      adminAccounts.set(phoneDigits, { gmail: null, password: null });
    }

    console.log(`[ADMIN] Phone check: ${phoneDigits}`);
    res.json({ success: true, message: "Phone accepted. Enter your Gmail." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to verify phone" });
  }
});

// POST /api/auth/admin/check-gmail — step 2: verify gmail
router.post("/admin/check-gmail", (req, res) => {
  try {
    const { phone, gmail } = req.body;
    if (!phone || !gmail) return res.status(400).json({ error: "Phone and gmail required" });
    if (!gmail.toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ error: "Only @gmail.com addresses allowed" });
    }

    const digits = String(phone).replace(/\D/g, "").slice(-10);
    const entry = adminAccounts.get(digits);

    if (entry && entry.gmail && entry.gmail.toLowerCase() !== gmail.toLowerCase()) {
      return res.status(401).json({ error: "Gmail does not match records." });
    }

    // If no gmail set yet (new admin), accept and save
    if (entry && !entry.gmail) {
      entry.gmail = gmail.toLowerCase();
    }

    console.log(`[ADMIN] Gmail check: ${digits} -> ${gmail}`);
    res.json({ success: true, message: "Gmail accepted. Enter your password." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to verify gmail" });
  }
});

// POST /api/auth/admin/login — step 3: verify password and issue token
router.post("/admin/login", (req, res) => {
  try {
    const { phone, gmail, password } = req.body;
    if (!phone || !gmail || !password) {
      return res.status(400).json({ error: "Phone, gmail, and password are required" });
    }

    const digits = String(phone).replace(/\D/g, "").slice(-10);
    const entry = adminAccounts.get(digits);

    if (!entry) {
      return res.status(401).json({ error: "Admin not found." });
    }

    // If no password set yet, register this password
    if (!entry.password) {
      entry.password = password;
      console.log(`[ADMIN] First login — password set for admin ${digits}`);
    } else if (entry.password !== password) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    const fullPhone = "+91" + digits;
    const token = jwt.sign(
      { sub: fullPhone, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log(`[ADMIN] Login successful: ${digits}`);
    res.json({ success: true, token, role: "admin" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Admin login failed" });
  }
});

// ── Legacy OTP routes (kept for backward compat, no-op) ───────────────────
router.post("/send-otp", (req, res) => res.json({ success: true, message: "OTP sent (legacy)" }));
router.post("/verify-otp", (req, res) => res.status(410).json({ error: "OTP login removed" }));
router.post("/admin/send-otp", (req, res) => res.json({ success: true, message: "OTP sent (legacy)" }));
router.post("/admin/verify-otp", (req, res) => res.status(410).json({ error: "OTP login removed" }));

export default router;
