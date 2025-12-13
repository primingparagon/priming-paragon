// services/auth-service/src/server.ts

// ... (imports and existing app setup code above this line) ...

// Define environment variables outside of the route handler to use them consistently
const environment = process.env.NODE_ENV || 'development';
const instanceId = process.env.INSTANCE_ID || uuidv4(); // Requires uuid import in the server file

// ---------------------------------------------------
// 8a. Health Check / Readiness Endpoint
// ---------------------------------------------------
// Checks DB and Redis connectivity, measures latency, returns correlation ID for tracing
app.get("/health", async (req: Request, res: Response) => {
  const correlationId = req.correlationId; 
  const timestamp = new Date().toISOString();
  const start = Date.now(); 
  
  let dbStatus = 'unreachable';
  let redisStatus = 'unreachable';

  try {
    // Check PostgreSQL connectivity
    await pool.query('SELECT 1');
    dbStatus = 'ok';

    // Check Redis connectivity
    await redis.ping();
    redisStatus = 'ok';

    const durationMs = Date.now() - start;

    // Return a 200 OK status with full details
    res.status(200).json({
      status: "ok",
      service: "auth-service",
      environment,
      instanceId,
      db: dbStatus,
      redis: redisStatus,
      correlationId,
      timestamp,
      latencyMs: durationMs
    });

  } catch (err) {
    const durationMs = Date.now() - start;

    // Log the failure with detailed context for observability
    logger.error('HEALTH_CHECK_FAILURE', {
        event: 'health_check_failure',
        service: 'auth-service',
        environment,
        instanceId,
        correlationId,
        durationMs,
        dbStatus,
        redisStatus,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
    });
    
    res.status(500).json({ 
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      service: "auth-service",
      environment,
      instanceId,
      correlationId,
      timestamp,
      latencyMs: durationMs
    });
  }
});

// ---------------------------------------------------
// 8b. Liveness Check Endpoint
// ---------------------------------------------------
// Simple check to see if the service process is alive.
// Returns correlationId, timestamp, and instance info for tracing.
app.get("/healthz", (req: Request, res: Response) => {
    const correlationId = req.correlationId;
    const timestamp = new Date().toISOString();
    const start = Date.now();

    try {
        const durationMs = Date.now() - start;
        // Minimal response: service is alive
        res.status(200).json({
            status: "alive",
            service: "auth-service",
            environment,
            instanceId,
            correlationId,
            timestamp,
            latencyMs: durationMs
        });
    } catch (err) {
        logger.error('LIVENESS_CHECK_FAILURE', {
            error: err instanceof Error ? err.message : String(err),
            correlationId
        });
        res.status(500).json({
            status: "error",
            service: "auth-service",
            correlationId,
            timestamp
        });
    }
});

// ... (Admin Routes, Start Server code below this line) ...
