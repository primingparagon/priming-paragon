import express from "express";
import axios from "axios";

const router = express.Router();

const TUTORING_ENGINE_URL = process.env.TUTORING_ENGINE_URL;
const INGEST_URL = process.env.PEDAGOGY_INGEST_URL;

// Example proxy to tutoring engine
router.get("/tutor/ping", async (req, res) => {
  try {
    const response = await axios.get(`${TUTORING_ENGINE_URL}/health`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "tutoring-engine unavailable" });
  }
});

export default router;

