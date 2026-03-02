/**
 * sqlite-compat.js
 * A synchronous compatibility shim that wraps sql.js to mimic the
 * better-sqlite3 API (prepare → { run, get, all }, exec, close).
 * Data is persisted to a .db file on disk via fs.writeFileSync after
 * each mutation, so it survives restarts.
 */
import initSqlJs from "sql.js";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the sql.js WASM file from node_modules
const wasmPath = join(__dirname, "../node_modules/sql.js/dist/sql-wasm.wasm");

let _db = null;
let _dbPath = null;

function persist() {
  if (_dbPath && _db) {
    const data = _db.export();
    fs.writeFileSync(_dbPath, Buffer.from(data));
  }
}

// Determine if a SQL string is a mutation (write) operation
function isMutation(sql) {
  const s = sql.trim().toUpperCase();
  return (
    s.startsWith("INSERT") ||
    s.startsWith("UPDATE") ||
    s.startsWith("DELETE") ||
    s.startsWith("CREATE") ||
    s.startsWith("DROP") ||
    s.startsWith("ALTER") ||
    s.startsWith("REPLACE")
  );
}

export function createDatabase(dbPath) {
  _dbPath = dbPath;

  // sql.js is async-init but we need to return synchronously.
  // We use a synchronous approach: load WASM binary first, then init.
  const wasmBinary = fs.readFileSync(wasmPath);

  // We need to initialise synchronously. sql.js supports passing wasmBinary
  // to avoid fetching, but initSqlJs is still a Promise.
  // Solution: use a sync-over-async trick with a shared buffer via
  // Atomics.wait on a SharedArrayBuffer. However, the simplest approach
  // for Node.js is to use spawnSync or the synchronous file API.
  //
  // Actually, the cleanest Node.js approach: we'll initialise the DB
  // at module load time using a top-level await (ES modules support this).
  // But since the caller (db/index.js) does top-level statements, we
  // export an async factory instead and update index.js to use it.
  //
  // Return a promise; index.js will await it.
  return initSqlJs({ wasmBinary }).then((SQL) => {
    let sqlDb;
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(fileBuffer);
    } else {
      sqlDb = new SQL.Database();
    }

    _db = sqlDb;

    // Wrap to mimic better-sqlite3 interface
    return new DatabaseWrapper(sqlDb, dbPath);
  });
}

class DatabaseWrapper {
  constructor(sqlDb, dbPath) {
    this._db = sqlDb;
    this._path = dbPath;
  }

  exec(sql) {
    this._db.run(sql);
    persist();
    return this;
  }

  prepare(sql) {
    return new StatementWrapper(this._db, sql, this._path);
  }

  close() {
    persist();
    this._db.close();
  }
}

class StatementWrapper {
  constructor(db, sql, dbPath) {
    this._db = db;
    this._sql = sql;
    this._path = dbPath;
  }

  _bind(params) {
    return params && params.length > 0 ? params : undefined;
  }

  run(...params) {
    const flat = params.flat();
    this._db.run(this._sql, flat.length ? flat : undefined);
    persist();
    // Mimic lastInsertRowid
    const row = this._db.exec("SELECT last_insert_rowid() as id");
    const lastId = row.length && row[0].values.length ? row[0].values[0][0] : null;
    return { lastInsertRowid: lastId, changes: 1 };
  }

  get(...params) {
    const flat = params.flat();
    const stmt = this._db.prepare(this._sql);
    stmt.bind(flat.length ? flat : undefined);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const flat = params.flat();
    const results = [];
    const stmt = this._db.prepare(this._sql);
    stmt.bind(flat.length ? flat : undefined);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}
