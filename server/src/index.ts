import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// --- Routes ---
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "rentlink-server",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "RentLink Ghana API",
    version: "0.1.0",
    message: "Find. Verify. Pay. Protect.",
  });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`[server] RentLink API running on http://localhost:${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);
});
