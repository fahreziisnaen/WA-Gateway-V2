import rateLimit from 'express-rate-limit';

/**
 * Rate-limit middleware: 100 requests per minute per IP.
 * Health check endpoint is excluded.
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1_000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
});
