import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, "geosentinel.db");
const db = new Database(dbPath);

const schema = fs.readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// Clear seed data for idempotent re-runs
db.exec("DELETE FROM sos_alerts");
db.exec("DELETE FROM feedback");
db.exec("DELETE FROM danger_zones");

// Seed admin phone (demo)
try {
  db.prepare("INSERT INTO admins (phone) VALUES (?)").run("9876543210");
  console.log("Seeded admin phone: 9876543210");
} catch (e) {
  if (!e.message.includes("UNIQUE")) throw e;
}

// Seed danger zones
const dangerZones = [
  { lat: 28.62, lng: 77.22, radius: 600, name: "Yamuna River Basin", type: "water" },
  { lat: 28.6, lng: 77.2, radius: 300, name: "Construction Danger Area", type: "danger" },
  { lat: 28.53, lng: 77.24, radius: 450, name: "Okhla Lake Reserve", type: "water" },
];
const insDZ = db.prepare("INSERT INTO danger_zones (lat, lng, radius, name, type) VALUES (?, ?, ?, ?, ?)");
for (const z of dangerZones) {
  try {
    insDZ.run(z.lat, z.lng, z.radius, z.name, z.type);
  } catch (e) {
    if (!e.message.includes("UNIQUE")) console.warn(e);
  }
}

// Seed sample users
const users = [
  { phone: "+919876543210", email: "rahul@gmail.com", name: "Rahul Verma", user_type: "indian", identity: "1234 5678 9012", emergency_contact: "9876543210", state: "Delhi" },
  { phone: "+15550123", email: "sarah@gmail.com", name: "Sarah Chen", user_type: "foreigner", identity: "A1234567", emergency_contact: "5550123", state: "Maharashtra" },
  { phone: "+447700900000", email: "mike@gmail.com", name: "Mike Johnson", user_type: "foreigner", identity: "B7654321", emergency_contact: "7700900000", state: "Rajasthan" },
];
const insUser = db.prepare(
  "INSERT OR IGNORE INTO users (phone, email, name, user_type, identity, emergency_contact, state) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
for (const u of users) {
  insUser.run(u.phone, u.email, u.name, u.user_type, u.identity, u.emergency_contact, u.state);
}

// Seed SOS alerts
const alerts = [
  { user_id: 1, user_name: "Rahul Verma", lat: 28.612, lng: 77.209, type: "emergency", info: "Involved in a road accident, need immediate medical help.", status: "Active" },
  { user_id: 2, user_name: "Sarah Chen", lat: 28.635, lng: 77.225, type: "standard", info: "Lost in the market area.", status: "Resolved" },
  { user_id: 3, user_name: "Mike Johnson", lat: 28.601, lng: 77.198, type: "standard", info: "Suspected pickpocketing.", status: "Resolved" },
  { user_id: 1, user_name: "Aisha Patel", lat: 28.618, lng: 77.215, type: "standard", info: "Need directions to the hotel.", status: "Resolved" },
];
const insAlert = db.prepare(
  "INSERT INTO sos_alerts (user_id, user_name, lat, lng, type, info, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
for (const a of alerts) {
  insAlert.run(a.user_id, a.user_name, a.lat, a.lng, a.type, a.info, a.status);
}

// Seed feedback
const feedback = [
  { user_name: "Tourist_42", message: "Great app! SOS feature saved me.", rating: 5 },
  { user_name: "Traveler_88", message: "Map loads very smoothly.", rating: 4 },
  { user_name: "Explorer_15", message: "Geofence alerts are very accurate.", rating: 5 },
];
const insFb = db.prepare("INSERT INTO feedback (user_name, message, rating) VALUES (?, ?, ?)");
for (const f of feedback) {
  insFb.run(f.user_name, f.message, f.rating);
}

db.close();
console.log("Database initialized at", dbPath);
