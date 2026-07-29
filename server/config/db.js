const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
    
    if (!connectionString) {
      console.error('❌ No POSTGRES_URL or DATABASE_URL environment variable set');
      // Create a connection pool that always fails gracefully
      return {
        connect: async () => { throw new Error('No database configured'); },
        query: async () => { throw new Error('No database configured'); },
        end: async () => {}
      };
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Log pool creation
    console.log('✅ PostgreSQL connection pool created');
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('❌ Unexpected PostgreSQL pool error:', err.message);
    });
  }
  return pool;
}

/**
 * Wrapper class that mimics better-sqlite3's Statement API
 * but uses PostgreSQL via pg pool.
 * 
 * Usage (async only):
 *   const row = await db.prepare('SELECT * FROM users WHERE id = $1').get(id);
 *   const rows = await db.prepare('SELECT * FROM users').all();
 *   const result = await db.prepare('INSERT INTO users ...').run(...params);
 */
class Statement {
  constructor(pool, text) {
    this.pool = pool;
    // Auto-convert ? placeholders to $1, $2, etc. for PostgreSQL
    // better-sqlite3 uses ? for positional params, PG uses $1, $2, etc.
    let paramIndex = 0;
    this.text = text.replace(/\?/g, () => `$${++paramIndex}`);
  }

  /**
   * Get a single row (or undefined if not found)
   */
  async get(...params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(this.text, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get all rows
   */
  async all(...params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(this.text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  async run(...params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(this.text, params);
      return { 
        changes: result.rowCount, 
        lastInsertRowid: result.rows?.[0]?.id || null 
      };
    } finally {
      client.release();
    }
  }
}

/**
 * Database API compatible with better-sqlite3
 * 
 * db.prepare(sql).get(...) - single row
 * db.prepare(sql).all(...) - all rows  
 * db.prepare(sql).run(...) - execute
 * db.exec(sql) - execute raw SQL (for schema initialization)
 */
const db = {
  prepare(text) {
    return new Statement(getPool(), text);
  },

  async exec(text) {
    const client = await getPool().connect();
    try {
      await client.query(text);
    } finally {
      client.release();
    }
  },

  // Expose the pool for advanced usage
  getPool,
};

module.exports = db;
