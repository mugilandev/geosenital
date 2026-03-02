import { Router } from "express";
import { authUser } from "../middleware/auth.js";
import { db } from "../db/index.js";

const router = Router();

// POST /api/sos - create SOS/SUS alert
router.post("/", authUser, (req, res) => {
  try {
    const { lat, lng, type, info, isEmergency } = req.body;
    const alertType = type === "emergency" || isEmergency ? "emergency" : "standard";

    let user_id = null;
    let user_name = null;
    const sub = req.user.sub;
    const isPhone = /^\+?\d+$/.test(sub);
    const u = db.prepare(
      "SELECT id, name FROM users WHERE phone = ? OR email = ? ORDER BY id DESC LIMIT 1"
    ).get(isPhone ? sub : null, isPhone ? null : sub);
    if (u) {
      user_id = u.id;
      user_name = u.name;
    } else {
      user_name = "Unknown User";
    }

    const userLat = lat ?? 28.6139;
    const userLng = lng ?? 77.209;

    const r = db.prepare(
      "INSERT INTO sos_alerts (user_id, user_name, lat, lng, type, info, status) VALUES (?, ?, ?, ?, ?, ?, 'Active')"
    ).run(user_id, user_name, userLat, userLng, alertType, info || "No details");

    res.json({
      success: true,
      id: `SOS-${r.lastInsertRowid}`,
      alertId: r.lastInsertRowid,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create alert" });
  }
});

export default router;
