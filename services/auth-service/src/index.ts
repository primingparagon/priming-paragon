// services/auth-service/src/index.ts

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Pool } from 'pg';
import { logger } from './logging/logger';
import { adminLogsRouter } from './admin/adminLogsController';
import { anomalyContext } from './security/anomaly-engine';

// NOTE: The Express Request interface needs to be extended globally 
// in a shared type definition file (e.g., src/types/express.d.ts) 
// for 'req.user' and 'req.correlationId' to be known here.

// --- Database Setup ---
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Example secure options (ensure these ENV vars are set)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20, // Max concurrent connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
});

// --- Express App ---
const app = express();
app.use(express.json());

// --- Context Middleware ---
// Wraps each request in AsyncLocalStorage for anomalyContext
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Correlation-Id', correlationId);

  // Extract metadata for logging and anomaly context
  const context = {
    // userId might be null if middleware runs before auth
    userId: req.user?.userId ?? null, 
    correlationId,
    ip: req.ip ?? null, // req.ip might be undefined depending on proxy settings
    route: req.originalUrl,
    userAgent: req.headers['user-agent'] ?? null
  };

  // Run the rest of the application pipeline within this specific context
  anomalyContext.run(context, () => next());
});

// --- Health Endpoints ---
app.get('/health', (req: Request, res: Response) => {
  // Example of accessing context within a handler
  // const store = anomalyContext.getStore(); 
  res.json({ status: 'ok', service: 'auth-service' });
});
app.get('/', (req: Request, res: Response) => res.send('auth-service running'));

// --- Routers ---
// Pass the shared PG Pool to the router configuration functions
app.use(adminLogsRouter(pgPool));
// Example: app.use('/auth', authRouter(pgPool));

// --- Start Server with DB Connection ---
const port = process.env.PORT || 4001;

// Use an Immediately Invoked Function Expression (IIFE) for async startup
(async () => {
  try {
    // Ensure DB connection is successful before starting API listeners
    await pgPool.connect(); 
    logger.info('Database connection established successfully.');
    app.listen(port, () => {
      logger.info(`auth-service listening on port ${port}`);
    });
  } catch (err) {
    logger.error('Failed to connect to the database on startup', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
    // Exit the process if we cannot connect to the DB
    process.exit(1); 
  }
})();
