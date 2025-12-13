app.get("/healthz", async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1'); // DB check
    await redis.ping(); // Redis check
    res.status(200).json({ status: 'ok', db: 'ok', redis: 'ok', correlationId: req.correlationId });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err instanceof Error ? err.message : err, correlationId: req.correlationId });
  }
});
