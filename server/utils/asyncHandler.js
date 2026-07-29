/**
 * Async route handler wrapper for Express.
 * Catches promise rejections from async route handlers
 * and forwards them to Express error middleware.
 * 
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     const data = await db.prepare('SELECT ...').all();
 *     res.json({ data });
 *   }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
