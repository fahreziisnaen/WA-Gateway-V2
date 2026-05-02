import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[jwt] FATAL: JWT_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32');
  process.exit(1);
}

/**
 * Protect dashboard admin routes with JWT.
 * Token is issued by POST /auth/login.
 *
 * Reads from: Authorization: Bearer <jwt>
 */
export function jwtMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Dashboard login required' });
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    
    import('../services/user.service.js').then(({ findByUsername }) => {
      const user = findByUsername(payload.username);
      if (!user || user.id !== payload.id) {
        return res.status(401).json({ error: 'Unauthorized: User no longer exists' });
      }
      req.user = payload;
      next();
    }).catch(err => {
      return res.status(500).json({ error: 'Internal Server Error' });
    });
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token';
    return res.status(401).json({ error: `Unauthorized: ${message}` });
  }
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}
