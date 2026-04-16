// server.ts
// Application entry point.
// Phase 1: generate, damage, decode routes live.
// Phase 4: startWorkerQueue() added for simulation jobs.

import express, { Request, Response } from "express";
import cors from "cors";
import { generateRouter } from "../src/api/routes/generate";
import { damageRouter } from "../src/api/routes/damage";
import { decodeRouter } from "../src/api/routes/decode";
import { errorHandler } from "../src/api/middleware/errorHandler";
import { log } from "../src/utils/logger";

const PORT = process.env.PORT ?? 4000;

function initializeApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" })); // matrices can be large

  // Health check — useful for CI and Docker health probes
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", phase: 1 });
  });

  // Phase 1 routes
  app.use("/api/generate", generateRouter);
  app.use("/api/damage",   damageRouter);
  app.use("/api/decode",   decodeRouter);

  // Phase 4 stubs — registered but empty until Phase 4
  // app.use("/api/simulate", simulateRouter);

  // Error handler must be last
  app.use(errorHandler);

  return app;
}

const app = initializeApp();

app.listen(PORT, () => {
  log("info", `QRLab API running`, { port: PORT, phase: 1 });
});