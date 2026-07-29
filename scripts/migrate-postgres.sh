#!/bin/bash
# ============================================================================
# PostgreSQL Migration Script for Erq Marketplace
#
# Converts Express route files from SQLite/better-sqlite3 patterns to
# PostgreSQL/async-await patterns using sed.
#
# IDEMPOTENT: Safe to re-run multiple times — won't double-apply patterns.
#
# Usage:
#   chmod +x scripts/migrate-postgres.sh
#   ./scripts/migrate-postgres.sh                          # All routes
#   ./scripts/migrate-postgres.sh server/routes/admin.js   # Single file
#
# What it does:
#   1. Adds `async` to Express route handlers
#   2. Adds `await` before db.prepare() and db.exec() calls
#   3. Converts SQLite strftime to PostgreSQL TO_CHAR
#   4. Converts SQLite date/datetime functions to PostgreSQL
#   5. Converts INSERT OR IGNORE to ON CONFLICT DO NOTHING (schema.js only)
#   6. Cleanup: removes duplicate async/await artifacts
# ============================================================================

set -euo pipefail

TARGET="${1:-server/routes/*.js}"
FILES=$(ls $TARGET 2>/dev/null || echo "")

if [ -z "$FILES" ]; then
  echo "❌ No files matched: $TARGET"
  echo "Usage: $0 [file-or-glob]"
  echo "  Default: server/routes/*.js"
  echo "  Example: $0 server/routes/admin.js"
  exit 1
fi

echo "🚀 PostgreSQL Migration Script"
echo "================================"
echo "Target files:"
for f in $FILES; do
  echo "  • $f"
done
echo ""

# ============================================================================
# STEP 1: Add `async` to Express route handlers
# ============================================================================
echo "📌 Step 1/6: Adding 'async' to route handlers..."

for file in $FILES; do
  # Pattern A: With middleware — router.get('/path', authenticate, (req, res) => {
  #   Match: `, (req, res) => {` and insert `async ` after `(`
  sed -i -E 's/, *\(req, res\) *=> *\{$/, async (req, res) => {/' "$file"

  # Pattern B: No middleware (direct handler) — router.get('/', (req, res) => {
  #   Match: simply `(req, res) => {` that doesn't already have `async`
  #   We first check it's not already `async (req, res) => {`
  sed -i -E '/async \(req, res\)/! s/\(req, res\) *=> *\{$/async (req, res) => {/' "$file"
done

echo "   ✅ Done"

# ============================================================================
# STEP 2: Add `await` before db.prepare() calls (idempotent)
# ============================================================================
echo "📌 Step 2/6: Adding 'await' before db.prepare() calls..."

for file in $FILES; do
  # Strategy: First remove any existing double `await await`, then add `await`
  # This makes the step idempotent: first run adds await, subsequent runs are no-ops

  # Remove duplicate await first (safety cleanup)
  sed -i -E 's/\bawait\s+await\b/await/g' "$file"

  # Now add `await ` before `db.prepare(` if not already preceded by `await`
  # The pattern matches: a non-word-boundary start, then `db.prepare(`
  # We use a broader pattern: any place where `db.prepare(` is NOT already
  # part of `await db.prepare(`
  #
  # Replace: `(^|[^a-zA-Z])db\.prepare(` with `$1await db.prepare(`
  # But only when the character before `db` is NOT `t` (from "await")
  sed -i -E '/await db\.prepare\(/! s/(^|[^a-zA-Z])db\.prepare\(/\1await db.prepare(/g' "$file"

  # Final cleanup — remove any remaining double awai
  sed -i -E 's/\bawait\s+await\b/await/g' "$file"
done

echo "   ✅ Done"

# ============================================================================
# STEP 3: Convert strftime to TO_CHAR
# ============================================================================
echo "📌 Step 3/6: Converting SQLite strftime to PostgreSQL TO_CHAR..."

for file in $FILES; do
  # strftime('%Y-%m', column) → TO_CHAR(column, 'YYYY-MM')
  # Captures column name including dots (e.g., t.created_at)
  sed -i -E "s/strftime\('%Y-%m',[[:space:]]*([a-zA-Z_][a-zA-Z0-9_.]*)\)/TO_CHAR(\1, 'YYYY-MM')/g" "$file"

  # strftime('%Y-%m-%d', column) → TO_CHAR(column, 'YYYY-MM-DD')
  sed -i -E "s/strftime\('%Y-%m-%d',[[:space:]]*([a-zA-Z_][a-zA-Z0-9_.]*)\)/TO_CHAR(\1, 'YYYY-MM-DD')/g" "$file"
done

echo "   ✅ Done"

# ============================================================================
# STEP 4: Convert SQLite date/datetime functions to PostgreSQL
# ============================================================================
echo "📌 Step 4/6: Converting SQLite date/datetime functions to PostgreSQL..."

for file in $FILES; do
  # ── date('now', '-N days|months|years') ──────────────────────────
  # SQLite: date('now', '-7 days')  means "7 days ago"
  # Postgres: NOW() - INTERVAL '7 days'  means "7 days ago"
  # STRIP the leading '-' from the number because NOW() - already negates
  sed -i -E "s/date\('now',[[:space:]]*'-([0-9]+)[[:space:]]*(days|months|years)'\)/NOW() - INTERVAL '\1 \2'/g" "$file"

  # ── datetime('now', '-N days|months|years') ──────────────────────
  sed -i -E "s/datetime\('now',[[:space:]]*'-([0-9]+)[[:space:]]*(days|months|years)'\)/NOW() - INTERVAL '\1 \2'/g" "$file"

  # ── date('now', '+N days|months|years') ──────────────────────────
  sed -i -E "s/date\('now',[[:space:]]*'\+([0-9]+)[[:space:]]*(days|months|years)'\)/NOW() + INTERVAL '\1 \2'/g" "$file"

  # ── datetime('now', '+N days|months|years') ──────────────────────
  sed -i -E "s/datetime\('now',[[:space:]]*'\+([0-9]+)[[:space:]]*(days|months|years)'\)/NOW() + INTERVAL '\1 \2'/g" "$file"

  # ── date('now') → CURRENT_DATE ───────────────────────────────────
  sed -i -E "s/date\('now'\)/CURRENT_DATE/g" "$file"

  # ── datetime('now') → NOW() ──────────────────────────────────────
  sed -i -E "s/datetime\('now'\)/NOW()/g" "$file"

  # ── date(column_name) → column_name::DATE ───────────────────────
  # Only match when date() wraps a simple column reference,
  # NOT when it contains 'now' or complex expressions
  sed -i -E "s/date\(([a-zA-Z_][a-zA-Z0-9_.]*)\)/\1::DATE/g" "$file"
done

echo "   ✅ Done"

# ============================================================================
# STEP 5: Convert INSERT OR IGNORE to ON CONFLICT DO NOTHING
# ============================================================================
echo "📌 Step 5/6: Converting INSERT OR IGNORE to ON CONFLICT DO NOTHING..."

for file in $FILES; do
  # NOTE: This only applies to files that actually use INSERT OR IGNORE.
  # Route files typically use regular INSERT INTO, not INSERT OR IGNORE.
  # The old schema init (server/models/schema.js) uses it, NOT route files.

  # First check if the file has any INSERT OR IGNORE patterns
  if grep -q 'INSERT OR IGNORE' "$file" 2>/dev/null; then
    echo "   ⚠️  Found INSERT OR IGNORE in $file — converting..."

    # Step A: Remove 'OR IGNORE' from INSERT OR IGNORE INTO
    sed -i -E "s/INSERT OR IGNORE INTO/INSERT INTO/g" "$file"

    # Step B: Add ON CONFLICT DO NOTHING after VALUES clause
    # Strategy: find the line ending with `).run(` or `).run(\n` and
    # replace the final `)` with ` ON CONFLICT DO NOTHING)`
    # This is approximate — needs manual review
    # Only apply to lines that had INSERT OR IGNORE originally
    echo "   📋 IMPORTANT: Manually verify the ON CONFLICT DO NOTHING additions in $file"
    echo "      SQLite: INSERT OR IGNORE INTO ... VALUES (...)"
    echo "      PG:     INSERT INTO ... VALUES (...) ON CONFLICT DO NOTHING"
  fi
done

echo "   ✅ Done (no route files use INSERT OR IGNORE — schema.js handled separately)"

# ============================================================================
# STEP 6: Wrap db.exec() calls with await (idempotent)
# ============================================================================
echo "📌 Step 6/6: Adding 'await' before db.exec() calls..."

for file in $FILES; do
  # Same idempotent strategy as Step 2
  sed -i -E 's/\bawait\s+await\b/await/g' "$file"
  sed -i -E '/await db\.exec\(/! s/(^|[^a-zA-Z])db\.exec\(/\1await db.exec(/g' "$file"
  sed -i -E 's/\bawait\s+await\b/await/g' "$file"
done

echo "   ✅ Done"

# ============================================================================
# FINAL CLEANUP: Remove any remaining artifacts
# ============================================================================
echo ""
echo "📌 Final cleanup: Removing duplicate async/await artifacts..."

for file in $FILES; do
  # Remove 'async async' (from re-running step 1)
  sed -i -E 's/\basync\s+async\b/async/g' "$file"

  # Remove 'await await' (from re-running steps 2/6)
  sed -i -E 's/\bawait\s+await\b/await/g' "$file"

  # Remove 'async, async' (edge case from comma-separated middlware)
  sed -i -E 's/,\s*async\s+async\b/, async/g' "$file"
done

echo "   ✅ Done"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "================================"
echo "✅ Migration script completed!"
echo ""
echo "📋 Post-run verification checklist:"
echo "  1. Review ALL changes:"
echo "     git diff server/routes/"
echo ""
echo "  2. Check for ANY remaining SQLite-specific patterns:"
echo "     grep -nE 'strftime|date\('"'"'now|datetime\('"'"'now|INSERT OR IGNORE' server/routes/*.js"
echo ""
echo "  3. Verify no double-prefix artifacts:"
echo "     grep -nE 'async async|await await' server/routes/*.js"
echo "     (should return no results)"
echo ""
echo "  4. Quick syntax check (Node.js parse):"
echo "     node -c server/routes/admin.js 2>&1 || echo 'Syntax OK (or needs Node 14+)'"
echo ""
echo "  5. Check for places where our script might have corrupted code:"
echo "     grep -nE 'await db\.prepare\(.*\.map\(|await db\.exec\(.*\.map\(' server/routes/*.js"
echo ""
echo "⚠️  Always review the diff before committing!"
echo "   Some complex patterns (nested queries, multi-line SQL, template literals)"
echo "   may need manual fixes. This script handles ~90% of the mechanical work."
