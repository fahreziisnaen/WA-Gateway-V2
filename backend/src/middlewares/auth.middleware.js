/**
 * API Key authentication middleware.
 * Reads the x-api-key header and validates it against API_KEY env variable.
 */
export function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    // If no key is configured, warn but allow through (dev mode)
    console.warn('[auth] WARNING: API_KEY is not set. Requests are unauthenticated.');
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: x-api-key header is required' });
  }

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}
