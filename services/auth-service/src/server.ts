// services/auth-service/src/server.ts

// ... (imports and existing app setup code above this line) ...

// ---------------------------------------------------
// 8. Health Check / Readiness Endpoint
// ---------------------------------------------------
// Checks DB and Redis connectivity, returns correlation ID for tracing
app.get("/health", async (req: Request, res: Response) => {
  // Always capture correlation ID for distributed tracing and error correlation
  const correlationId = req.correlationId; 

  try {
    // Check PostgreSQL connectivity by running a minimal query
    await pool.query('SELECT 1');

    // Check Redis connectivity by sending a PING command
    await redis.ping();

    // If both succeed, return a 200 OK status
    res.status(200).json({ 
      status: "ok",
      db: "ok",
      redis: "ok",
      service: "auth-service",
      correlationId
    });

  } catch (err) {
    // If either fails, return a 500 Internal Server Error status
    logger.error('HEALTH_CHECK_FAILURE', { error: err, correlationId });
    res.status(500).json({ 
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      service: "auth-service",
      correlationId
    });
  }
});

// ... (Admin Routes, Start Server code below this line) ...
