/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express app as a single serverless function.
 * It imports the app setup (middleware, routes) and exports it
 * for Vercel's Node.js runtime.
 * 
 * Database (PostgreSQL), file uploads (memory), and auth all work
 * within the request/response lifecycle of each serverless invocation.
 * 
 * Socket.io is NOT available in this serverless environment.
 * The client gracefully degrades to HTTP polling for messaging.
 */

// Set VERCEL flag so server/app.js knows to skip socket.io & server.listen
process.env.VERCEL = 'true';

const app = require('../server/app');

// For Vercel, we export a function that handles the request
// Vercel wraps Express apps automatically when we export the app
module.exports = app;
