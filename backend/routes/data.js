import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

// GET /api/data/danger-zones - public, used by Dashboard
router.get("/danger-zones", (req, res) => {
  try {
    const rows = db.prepare("SELECT lat, lng, radius, name, type FROM danger_zones").all();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch danger zones" });
  }
});

export default router;
