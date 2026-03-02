import { Router } from "express";
import { authUser } from "../middleware/auth.js";
import { db } from "../db/index.js";

const router = Router();

// POST /api/users/profile - create or update profile (after user login)
router.post("/profile", authUser, (req, res) => {
  try {
    const { name, userType, identity, emergencyContact, state, coords } = req.body;
    if (!name || !userType || !identity || !emergencyContact || !state) {
      return res.status(400).json({ error: "name, userType, identity, emergencyContact, state required" });
    }

    const sub = req.user.sub;
    const lat = coords?.lat ?? null;
    const lng = coords?.lng ?? null;

    // Parse identifier: sub can be +919876543210 or email@gmail.com
    const isPhone = /^\+?\d+$/.test(sub);
    const phone = isPhone ? sub : null;
    const email = isPhone ? null : sub;

    const existing = db.prepare(
      "SELECT id FROM users WHERE phone = ? OR email = ?"
    ).get(phone || "", email || "");

    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      db.prepare(
        "UPDATE users SET name = ?, user_type = ?, identity = ?, emergency_contact = ?, state = ?, lat = ?, lng = ?, updated_at = ? WHERE id = ?"
      ).run(name, userType, identity.replace(/\s/g, ""), emergencyContact, state, lat, lng, now, existing.id);
      return res.json({ success: true, userId: existing.id });
    }

    const r = db.prepare(
      "INSERT INTO users (phone, email, name, user_type, identity, emergency_contact, state, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(phone, email, name, userType, identity.replace(/\s/g, ""), emergencyContact, state, lat, lng);
    res.json({ success: true, userId: r.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// GET /api/users/profile - get current user profile
router.get("/profile", authUser, (req, res) => {
  try {
    const sub = req.user.sub;
    const isPhone = /^\+?\d+$/.test(sub);
    const row = db.prepare(
      "SELECT * FROM users WHERE phone = ? OR email = ? ORDER BY id DESC LIMIT 1"
    ).get(isPhone ? sub : null, isPhone ? null : sub);

    if (!row) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({
      id: row.id,
      name: row.name,
      userType: row.user_type,
      identity: row.identity,
      emergencyContact: row.emergency_contact,
      state: row.state,
      coords: row.lat != null ? { lat: row.lat, lng: row.lng } : null,
      phone: row.phone,
      email: row.email,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
