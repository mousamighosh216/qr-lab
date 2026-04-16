// src/api/routes/damage.ts

import { Router, Request, Response, NextFunction } from "express";
import type { Matrix, DamageConfig } from "@qrlab/types";
import type { DamageResult } from "@qrlab/types";
import { applyDamage, getDamageMetadata } from "../../simulation/damageEngine";
import { validateDamageRequest } from "../middleware/validate";
import { getECBlockConfig } from "../../core/qr/version";

export const damageRouter = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Estimates whether the damaged matrix is likely recoverable.
 * Phase 1: simple heuristic based on damage percentage vs EC level capacity.
 * Phase 2: per-block analysis using the actual block config.
 */
function estimateRecoverability(
  metadata: ReturnType<typeof getDamageMetadata>,
  ecLevel: string
): DamageResult["recoverabilityEstimate"] {
  // Approximate theoretical limits per EC level (% of total codewords correctable)
  const EC_CAPACITY: Record<string, number> = { L: 7, M: 15, Q: 25, H: 30 };
  const limit = EC_CAPACITY[ecLevel] ?? 15;
  const pct = metadata.damagePercent;

  return {
    expectedSuccess: pct < limit,
    blocksAtRisk: pct > limit * 0.7 ? [0, 1] : [],
    confidence: pct < limit * 0.5 ? 0.95 : pct < limit ? 0.7 : 0.25,
  };
}

// ─── POST /api/damage ─────────────────────────────────────────────────────────

damageRouter.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    validateDamageRequest(req);

    const { matrix, config } = req.body as {
      matrix: Matrix;
      config: DamageConfig;
      ecLevel?: string;
    };

    const { matrix: damagedMatrix, metadata } = applyDamage(matrix, config);
    const ecLevel = req.body.ecLevel ?? "M";

    const result: DamageResult = {
      damagedMatrix,
      metadata,
      recoverabilityEstimate: estimateRecoverability(metadata, ecLevel),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/damage/preview ─────────────────────────────────────────────────
// Identical logic to /damage — kept separate so the frontend can call it
// on every slider change without the UI treating it as a committed action.

damageRouter.post("/preview", (req: Request, res: Response, next: NextFunction) => {
  try {
    validateDamageRequest(req);

    const { matrix, config } = req.body as {
      matrix: Matrix;
      config: DamageConfig;
      ecLevel?: string;
    };

    const { matrix: damagedMatrix, metadata } = applyDamage(matrix, config);
    const ecLevel = req.body.ecLevel ?? "M";

    const result: DamageResult = {
      damagedMatrix,
      metadata,
      recoverabilityEstimate: estimateRecoverability(metadata, ecLevel),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});