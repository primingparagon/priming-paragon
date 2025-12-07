import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use("/", routes);

// Health Endpoint (Render requires this!)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

