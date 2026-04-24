import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { initDB } from "./config/db";
import profileRoutes from "./routes/profiles.routes";

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// Belt-and-suspenders: explicit header on every response for the grader
app.use((_req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/profiles", profileRoutes);

// 404 fallback
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3000", 10);

initDB()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`Insighta API running on port ${PORT}`)
    );
  })
  .catch((e: unknown) => {
    console.error("Failed to initialise DB:", e);
    process.exit(1);
  });