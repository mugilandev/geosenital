import { Router } from "express";
import { authAdmin } from "../middleware/auth.js";
import { db } from "../db/index.js";

const router = Router();

// All admin routes require admin auth
router.use(authAdmin);

// GET /api/admin/stats
router.get("/stats", (req, res) => {
  try {
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const activeAlerts = db.prepare("SELECT COUNT(*) as c FROM sos_alerts WHERE status = 'Active'").get().c;
    const totalAlerts = db.prepare("SELECT COUNT(*) as c FROM sos_alerts").get().c;
    const resolvedAlerts = totalAlerts - activeAlerts;

    res.json({
      totalUsers: String(totalUsers),
      activeNow: "342", // Could derive from last_activity; keeping mock for UI
      sosAlerts: String(activeAlerts),
      geofenceViolations: "67", // Placeholder; integrate with geofence logic later
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/users
router.get("/users", (req, res) => {
  try {
    const rows = db.prepare(
      "SELECT id, name, email, phone, created_at FROM users ORDER BY id DESC LIMIT 100"
    ).all();

    const users = rows.map((r) => ({
      name: r.name,
      email: r.email || "-",
      phone: r.phone ? (r.phone.startsWith("+") ? r.phone : `+${r.phone}`) : "-",
      joined: formatTimeAgo(r.created_at),
    }));

    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/sos
router.get("/sos", (req, res) => {
  try {
    const rows = db.prepare(
      "SELECT id, user_name, lat, lng, type, info, status, created_at FROM sos_alerts ORDER BY id DESC LIMIT 100"
    ).all();

    const alerts = rows.map((r) => ({
      id: `SOS-${r.id}`,
      user: r.user_name,
      time: formatTimeAgo(r.created_at),
      lat: r.lat,
      lng: r.lng,
      status: r.status,
      type: r.type,
      info: r.info || "",
    }));

    res.json(alerts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// PATCH /api/admin/sos/:id - resolve alert
router.patch("/sos/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    db.prepare("UPDATE sos_alerts SET status = 'Resolved' WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update alert" });
  }
});

// GET /api/admin/feedback
router.get("/feedback", (req, res) => {
  try {
    const rows = db.prepare(
      "SELECT user_name as user, message, rating FROM feedback ORDER BY id DESC LIMIT 50"
    ).all();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// POST /api/admin/feedback - submit feedback (can be from user too; keeping in admin for simplicity)
router.post("/feedback", (req, res) => {
  try {
    const { user, message, rating } = req.body;
    if (!user || !message || rating == null) {
      return res.status(400).json({ error: "user, message, rating required" });
    }
    const r = db.prepare("INSERT INTO feedback (user_name, message, rating) VALUES (?, ?, ?)").run(user, message, rating);
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

function formatTimeAgo(ts) {
  if (!ts) return "Unknown";
  const sec = Math.floor(Date.now() / 1000) - ts;
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return "Long ago";
}

export default router;
