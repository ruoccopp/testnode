import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_name TEXT NOT NULL,
  macro_category TEXT NOT NULL,
  ateco_code TEXT,
  start_date TEXT NOT NULL,
  is_startup INTEGER DEFAULT 0,
  contribution_regime TEXT NOT NULL,
  contribution_reduction TEXT DEFAULT 'NONE',
  has_other_coverage INTEGER DEFAULT 0,
  current_balance REAL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tax_calculations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  revenue REAL NOT NULL,
  taxable_income REAL NOT NULL,
  tax_rate REAL NOT NULL,
  tax_amount REAL NOT NULL,
  inps_amount REAL NOT NULL,
  total_due REAL NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  amount REAL NOT NULL,
  is_paid INTEGER DEFAULT 0,
  paid_date TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  vat_number TEXT,
  business_sector TEXT NOT NULL,
  revenue REAL,
  category TEXT,
  start_date TEXT,
  is_startup INTEGER,
  contribution_regime TEXT,
  status TEXT DEFAULT 'NEW',
  notes TEXT,
  created_at INTEGER NOT NULL
);
`);

console.log('Database tables created successfully');
db.close();