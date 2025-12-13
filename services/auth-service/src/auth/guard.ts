import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import winston from 'winston';

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// JWT payload interface
interface UserPayload {
  userId: number;
  email: string;
  role: string; // Standardize role property
}

// Extend Express.Request with user
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  // Use optional chaining for safer access
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    logger.warn({ route: req.originalUrl, message: 'Missing token' });
    // 401 Unauthorized
    return res.status(401).json({ message: 'Authentication required: No token provided.' });
  }

  const secretKey = process.env.JWT_SECRET_KEY;
  if (!secretKey) {
    logger.error({ message: 'JWT_SECRET_KEY not configured' });
    // 500 Internal Server Error
    return res.status(500).json({ message: 'Server configuration error.' });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as UserPayload;

    if (!decoded || !decoded.userId || !decoded.email || !decoded.role) {
      logger.warn({ message: 'JWT missing required payload fields', decoded });
      // 403 Forbidden: Token structure is wrong, even if the signature is valid.
      return res.status(403).json({ message: 'Invalid token payload.' });
    }

    // Attach the verified user object to the request
    req.user = decoded;
    next();

  } catch (err) {
    // --- Code Completion ---
    if (err instanceof TokenExpiredError) {
      logger.warn({ message: 'Token expired', route: req.originalUrl });
      // 401 Unauthorized: Token was valid but time expired
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err instanceof JsonWebTokenError) {
      logger.warn({ message: 'Invalid token signature or malformed token', route: req.originalUrl });
      // 403 Forbidden: Token signature verification failed
      return res.status(403).json({ message: 'Invalid token' });
    }
    
    // Generic catch-all for any other unexpected error
    logger.error({ message: 'Unexpected error during token verification', error: err, route: req.originalUrl });
    res.status(500).json({ message: 'An unexpected authentication error occurred.' });
    // --- End Code Completion ---
  }
};
