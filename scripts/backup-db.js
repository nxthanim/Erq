/**
 * Gebeya Database Backup & Restore Utility
 *
 * Backup:   node scripts/backup-db.js backup [output.json]
 * Restore:  node scripts/backup-db.js restore [input.json]
 *
 * This allows you to transfer your database across devices.
 * 1. Run `backup` on device A → creates a portable .json file
 * 2. Copy the .json file to device B
 * 3. Run `restore` on device B → imports all data into that device's SQLite
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'data', 'gebeya.db');
const DEFAULT_BACKUP = path.resolve(__dirname, '..', 'gebeya-db-backup.json');

// Tables to backup — all user-facing data (exclude system/internal if needed)
const TABLES = [
  'users',
  'gigs',
  'jobs',
  'job_bids',
  'messages',
  'transactions',
  'reviews',
  'categories',
  'user_agents',
  'agent_conversations',
  'agent_messages',
  'business_customers',
  'business_meetings',
  'business_invoices',
  'business_team',
  'websites',
  'notifications',
  'email_verifications',
  'saved_gigs',
  'disputes',
  'referral_codes',
  'user_analytics_events',
  'activity_feed',
  'skill_badges',
  'portfolio_items',
];

function backup(outputPath) {
  const out = outputPath || DEFAULT_BACKUP;
  console.log(`📦 Backing up database from: ${DB_PATH}`);
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found at:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  const backupData = { version: 1, exportedAt: new Date().toISOString(), tables: {} };

  for (const table of TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length > 0) {
        backupData.tables[table] = rows;
        console.log(`  ✓ ${table}: ${rows.length} rows`);
      } else {
        console.log(`  - ${table}: empty`);
      }
    } catch (err) {
      // Table may not exist yet — skip silently
      console.log(`  ~ ${table}: not found (skipped)`);
    }
  }

  db.close();

  fs.writeFileSync(out, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\n✅ Backup saved to: ${out}`);
  console.log(`   File size: ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);

  const totalRows = Object.values(backupData.tables).reduce((sum, rows) => sum + rows.length, 0);
  console.log(`   Total records: ${totalRows}`);
}

function restore(inputPath) {
  const inp = inputPath || DEFAULT_BACKUP;
  console.log(`📂 Restoring database from: ${inp}`);

  if (!fs.existsSync(inp)) {
    console.error('❌ Backup file not found at:', inp);
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found at:', DB_PATH);
    console.log('   Make sure the server has been started at least once on this device.');
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(inp, 'utf-8'));
  console.log(`   Backup from: ${backupData.exportedAt}`);
  console.log(`   Tables: ${Object.keys(backupData.tables).length}`);

  const db = new Database(DB_PATH);

  // Disable foreign keys during bulk restore to avoid dependency order issues
  db.pragma('foreign_keys = OFF');

  // Wrap in a transaction for speed and atomicity
  const restoreTransaction = db.transaction(() => {
    for (const [table, rows] of Object.entries(backupData.tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      
      try {
        // Check if table exists first
        const tableExists = db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(table);
        
        if (!tableExists) {
          console.log(`  ~ ${table}: table doesn't exist on this device (skipped)`);
          continue;
        }

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        const insert = db.prepare(insertSql);

        let imported = 0;
        for (const row of rows) {
          const values = columns.map(col => row[col] ?? null);
          insert.run(...values);
          imported++;
        }
        console.log(`  ✓ ${table}: ${imported} rows restored`);
      } catch (err) {
        console.error(`  ✗ ${table}: error — ${err.message}`);
      }
    }
  });

  try {
    restoreTransaction();
    console.log(`\n✅ Database restored successfully!`);
    console.log(`   Restart the server for changes to take full effect.`);
  } catch (err) {
    console.error('❌ Restore failed:', err.message);
    process.exit(1);
  } finally {
    // Re-enable foreign keys
    db.pragma('foreign_keys = ON');
    db.close();
  }
}

// ====== CLI ======
const command = process.argv[2];
const fileArg = process.argv[3];

if (!command || command === '--help' || command === '-h') {
  console.log(`
📋 Gebeya Database Backup & Restore

  Usage:
    node scripts/backup-db.js backup [output.json]    Export DB to JSON file
    node scripts/backup-db.js restore [input.json]     Import JSON file into DB

  Examples:
    node scripts/backup-db.js backup
    node scripts/backup-db.js backup my-backup.json
    node scripts/backup-db.js restore my-backup.json
  `);
  process.exit(0);
}

if (command === 'backup') {
  backup(fileArg);
} else if (command === 'restore') {
  restore(fileArg);
} else {
  console.error(`Unknown command: ${command}. Use "backup" or "restore".`);
  process.exit(1);
}
