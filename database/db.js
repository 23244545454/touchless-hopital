// =====================================================================
// database/db.js — Database Connection & Query Engine for Touchless HMS
// Uses Node 22/24 built-in native SQLite (node:sqlite DatabaseSync)
// =====================================================================

const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'touchless_hms.db');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');
  console.log(`[Database] Connected to SQLite database at: ${DB_PATH}`);
} catch (err) {
  console.error('[Database] Failed to load node:sqlite native module:', err.message);
  throw err;
}

// Initialize tables and seed data from schema.sql
function initDatabase() {
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!tableCheck) {
      console.log('[Database] Initializing schema and seed data from schema.sql...');
      const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schemaSql);
      console.log('[Database] Schema and seed data successfully initialized!');
    } else {
      console.log('[Database] Tables already exist. Ready.');
    }
  } catch (err) {
    console.error('[Database] Error initializing schema:', err);
  }
}

// Safe query helpers
function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error(`[DB Error - all] ${sql}`, err.message);
    throw err;
  }
}

function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  } catch (err) {
    console.error(`[DB Error - get] ${sql}`, err.message);
    throw err;
  }
}

function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (err) {
    console.error(`[DB Error - run] ${sql}`, err.message);
    throw err;
  }
}

function exec(sql) {
  return db.exec(sql);
}

// Run init
initDatabase();

module.exports = {
  db,
  all,
  get,
  run,
  exec,
  DB_PATH
};
