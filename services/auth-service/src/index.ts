import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.post("/signup", async (req, res) => {
  const { email } = req.body;
  // In prod: hash password, store in DB (Supabase), etc.
  const userId = uuidv4();
  const token = jwt.sign({ sub: userId, email, role: "student" }, JWT_SECRET, { expiresIn: "15m" });
  res.status(201).json({ userId, accessToken: token });
});

app.post("/login", (req, res) => {
  const { email } = req.body;
  const userId = uuidv4();
  const token = jwt.sign({ sub: userId, email, role: "student" }, JWT_SECRET, { expiresIn: "15m" });
  res.json({ accessToken: token });
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "auth-service" }));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Auth service running on ${port}`));
