import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'vendor-finder.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDB() {
  // Create opportunities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      location_lat REAL,
      location_lng REAL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      vendor_id INTEGER NOT NULL,
      opportunity_id TEXT NOT NULL,
      vendor_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    )
  `);

  // Create messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      subject TEXT,
      message_body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Create quotes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      vendor_id INTEGER NOT NULL,
      opportunity_id TEXT NOT NULL,
      quote_amount REAL NOT NULL,
      notes TEXT,
      arrival_date TEXT,
      arrival_time TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    )
  `);

  // Insert demo opportunity if not exists
  const existingOpportunity = db.prepare('SELECT id FROM opportunities LIMIT 1').get();
  if (!existingOpportunity) {
    db.prepare(`
      INSERT INTO opportunities (id, title, description, location, location_lat, location_lng, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'demo-opportunity-id',
      'Downtown LA Waste Management',
      'Need waste removal and hauling services for commercial property renovation in downtown Los Angeles.',
      'Los Angeles, CA',
      34.0522,
      -118.2437,
      'active'
    );
  }
}

export default db;
