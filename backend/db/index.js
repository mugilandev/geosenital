import initSqlJs from "sql.js";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, "geosentinel.db");
const wasmPath = join(__dirname, "../node_modules/sql.js/dist/sql-wasm.wasm");
const schemaPath = join(__dirname, "schema.sql");

// ── Password hashing (must match auth.js) ─────────────────────────────────
function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "geosentinel_salt").digest("hex");
}

// ── sql.js compatibility wrapper (mimics better-sqlite3 sync API) ──────────
let _sqlDb = null;

function persist() {
  if (_sqlDb && dbPath) {
    try {
      const data = _sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (e) {
      console.error("[DB] persist error:", e.message);
    }
  }
}

class StatementWrapper {
  constructor(sql) {
    this._sql = sql;
  }

  run(...params) {
    const flat = params.flat();
    _sqlDb.run(this._sql, flat.length ? flat : undefined);
    persist();
    const row = _sqlDb.exec("SELECT last_insert_rowid() as id");
    const lastId = row.length && row[0].values.length ? row[0].values[0][0] : null;
    return { lastInsertRowid: lastId, changes: 1 };
  }

  get(...params) {
    const flat = params.flat();
    const stmt = _sqlDb.prepare(this._sql);
    try {
      stmt.bind(flat.length ? flat : undefined);
      if (stmt.step()) return stmt.getAsObject();
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params) {
    const flat = params.flat();
    const results = [];
    const stmt = _sqlDb.prepare(this._sql);
    try {
      stmt.bind(flat.length ? flat : undefined);
      while (stmt.step()) results.push(stmt.getAsObject());
    } finally {
      stmt.free();
    }
    return results;
  }
}

class DatabaseWrapper {
  exec(sql) {
    _sqlDb.run(sql);
    persist();
    return this;
  }
  prepare(sql) {
    return new StatementWrapper(sql);
  }
  close() {
    persist();
    _sqlDb.close();
  }
}

// ── Init DB ────────────────────────────────────────────────────────────────
const wasmBinary = fs.readFileSync(wasmPath);
const SQL = await initSqlJs({ wasmBinary });

if (fs.existsSync(dbPath)) {
  const fileBuffer = fs.readFileSync(dbPath);
  _sqlDb = new SQL.Database(fileBuffer);
} else {
  _sqlDb = new SQL.Database();
}

export const db = new DatabaseWrapper();

// Apply schema (CREATE TABLE IF NOT EXISTS — safe to run every time)
const schema = fs.readFileSync(schemaPath, "utf-8");
db.exec(schema);

// ── Seed danger zones (once) ───────────────────────────────────────────────
const dzCount = db.prepare("SELECT COUNT(*) as c FROM danger_zones").get().c;
if (dzCount === 0) {
  db.exec(`INSERT INTO danger_zones (lat, lng, radius, name, type) VALUES
    (28.62, 77.22, 600, 'Yamuna River Basin', 'water'),
    (28.6,  77.2,  300, 'Construction Danger Area', 'danger'),
    (28.53, 77.24, 450, 'Okhla Lake Reserve', 'water')`);
  console.log("[DB] Danger zones seeded.");
}

// ── Seed pre-registered users ──────────────────────────────────────────────
const seededUsers = [
  {
    phone: "+919087456324",
    name: "Kamala",
    user_type: "indian",
    identity: "111122223333",
    emergency_contact: "9876543210",
    state: "Tamil Nadu",
    password: "xyz09876",
  },
  {
    phone: "+911234765346",
    name: "Prasanth",
    user_type: "indian",
    identity: "444455556666",
    emergency_contact: "9876543210",
    state: "Kerala",
    password: "abc9876",
  },
  {
    phone: "+918765903478",
    name: "GowkGowtham",
    user_type: "indian",
    identity: "777788889999",
    emergency_contact: "9876543210",
    state: "Karnataka",
    password: "xyzabc123",
  },
];

for (const u of seededUsers) {
  const exists = db.prepare("SELECT id FROM users WHERE phone = ?").get(u.phone);
  if (!exists) {
    db.prepare(
      `INSERT INTO users (phone, name, user_type, identity, emergency_contact, state, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(u.phone, u.name, u.user_type, u.identity, u.emergency_contact, u.state, hashPassword(u.password));
    console.log(`[DB] Seeded user: ${u.name} (${u.phone})`);
  }
}
