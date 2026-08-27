/**
 * Lightweight MVP monitoring utility.
 *
 * Logs errors and events to the browser console in dev,
 * and can be extended to send to an external service in production.
 *
 * Usage:
 *   import monitor from '../lib/monitor';
 *   monitor.error('Failed to load orders', { orderId: 'xxx' }, err);
 *   monitor.event('order_placed', { amount: 500 });
 */

const isDev = import.meta.env.DEV || false;

const monitor = {
  /**
   * Log an error event
   * @param {string} message - Human-readable description
   * @param {object} [context] - Additional context data
   * @param {Error} [error] - The Error object if available
   */
  error(message, context = {}, error = null) {
    const payload = {
      level: 'error',
      message,
      context,
      error: error?.toString() || null,
      stack: error?.stack || null,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    if (isDev) {
      console.error('[Monitor]', message, context, error?.stack || '');
    }

    // In production, Vercel Analytics auto-captures errors via the <Analytics /> component
    // Extend here to POST errors to a logging endpoint if needed
    if (!isDev && typeof window !== 'undefined') {
      // Ready for future extension — e.g. fetch('/api/log', { method: 'POST', body: JSON.stringify(payload) })
    }

    return payload;
  },

  /**
   * Track a user-facing event
   * @param {string} name - Event name (e.g. 'order_created', 'payment_complete')
   * @param {object} [data] - Event data
   */
  event(name, data = {}) {
    const payload = {
      level: 'info',
      name,
      data,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    if (isDev) {
      console.log('[Monitor Event]', name, data);
    }

    return payload;
  },

  /**
   * Track a performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value in ms
   */
  metric(name, value) {
    if (isDev) {
      console.log(`[Monitor Metric] ${name}: ${value}ms`);
    }
  },
};

// Expose globally for ErrorBoundary to access
if (typeof window !== 'undefined') {
  window.__monitor = monitor;
}

export default monitor;
