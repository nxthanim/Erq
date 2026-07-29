/**
 * Auto-migration script for Vercel serverless environment.
 * 
 * On first cold start, checks if the users table exists. If not,
 * runs the full migration.sql to create all tables. If tables exist,
 * it only runs any incremental schema changes (e.g., ALTER TABLE).
 * 
 * This avoids running 74 SQL statements on every cold start,
 * which was causing 1-3 second delays on Vercel serverless.
 */

const fs = require('fs');
const path = require('path');

let migrated = false;

async function runMigration(db) {
  if (migrated) return true;
  
  try {
    // Quick check: do tables already exist?
    let tablesExist = false;
    try {
      const result = await db.exec("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')");
      tablesExist = result.rows?.[0]?.exists === true || result?.[0]?.exists === true;
    } catch {}

    // Add last_active_at column to users table if it doesn't exist
    // (runs regardless of tables exist or not - safe to run multiple times)
    try {
      await db.exec('ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
    } catch (err) {
      // Column already exists - this is fine
    }

    // Make job_id nullable in transactions table (gig orders don't reference a job)
    try {
      await db.exec('ALTER TABLE transactions ALTER COLUMN job_id DROP NOT NULL;');
    } catch (err) {
      // Column already nullable or doesn't exist - ignore
    }

    // Add 'delivered' status to jobs CHECK constraint if missing (wasn't in initial migration)
    try {
      await db.exec('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;');
      await db.exec("ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('open', 'in_progress', 'delivered', 'completed', 'cancelled'));");
    } catch (err) {
      // Constraint may already be correct or PostgreSQL-specific syntax - ignore
      console.log('   ↳ jobs status constraint check (safe to ignore errors)');
    }

    // Create order_deliveries table if missing (wasn't in initial migration.sql)
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS order_deliveries (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT,
          files TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_order_deliveries_order ON order_deliveries(order_id);
      `);
    } catch (err) {
      console.warn('⚠️ Failed to create order_deliveries table:', err.message?.slice(0, 100));
    }

    // Create job_deliveries table if missing
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS job_deliveries (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT,
          files TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_job_deliveries_job ON job_deliveries(job_id);
      `);
    } catch (err) {
      console.warn('⚠️ Failed to create job_deliveries table:', err.message?.slice(0, 100));
    }

    if (tablesExist) {
      migrated = true;
      return true;
    }

    // Tables don't exist yet — run full migration
    const sqlPath = path.join(__dirname, 'migration.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn('⚠️ Migration file not found at:', sqlPath);
      return false;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const statements = sql
      .replace(/-- .*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🚀 Auto-migration: Running ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await db.exec(statement + ';');
        successCount++;
      } catch (err) {
        const msg = err.message || '';
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate key') ||
          msg.includes('Duplicate column') ||
          msg.includes('column") - already exists')
        ) {
          successCount++;
        } else {
          errorCount++;
          console.warn(`⚠️ Migration statement failed:`, err.message?.slice(0, 150));
        }
      }
    }

    console.log(`✅ Auto-migration complete: ${successCount} succeeded, ${errorCount} errors`);
    migrated = true;
    return true;
  } catch (err) {
    console.error('❌ Auto-migration failed:', err.message);
    return false;
  }
}

module.exports = { runMigration };
