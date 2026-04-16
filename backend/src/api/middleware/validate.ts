// src/api/middleware/validate.ts
// Throws structured ApiError on invalid input.
// Each route calls the relevant validator before touching any business logic.

import { Request, Response, NextFunction } from "express";

// ─── error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── shared guards ────────────────────────────────────────────────────────────

const VALID_EC_LEVELS = new Set(["L", "M", "Q", "H"]);
const VALID_DAMAGE_TYPES = new Set(["randomNoise", "blockErase", "burst", "logoEmbed"]);
const VALID_MODES = new Set(["numeric", "alphanumeric", "byte", "kanji"]);

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `"${field}" must be a non-empty string`, field);
  }
  return value.trim();
}

function requireECLevel(value: unknown, field = "ecLevel"): void {
  if (!VALID_EC_LEVELS.has(value as string)) {
    throw new ApiError(
      400,
      `"${field}" must be one of: L, M, Q, H — got "${value}"`,
      field
    );
  }
}

function requireMatrix(value: unknown, field = "matrix"): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, `"${field}" must be a non-empty 2D array`, field);
  }
  const cols = (value[0] as unknown[]).length;
  for (const row of value as unknown[][]) {
    if (!Array.isArray(row) || row.length !== cols) {
      throw new ApiError(400, `"${field}" rows must all have the same length`, field);
    }
  }
}

// ─── route validators ─────────────────────────────────────────────────────────

/**
 * POST /api/generate
 * Body: { input: string, ecLevel: 'L'|'M'|'Q'|'H', version?: number }
 */
export function validateGenerateRequest(req: Request): void {
  const { input, ecLevel, version } = req.body;

  requireString(input, "input");
  requireECLevel(ecLevel);

  if (version !== undefined) {
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || version > 40) {
      throw new ApiError(400, '"version" must be an integer between 1 and 40', "version");
    }
  }
}

/**
 * POST /api/damage  and  POST /api/damage/preview
 * Body: { matrix: ModuleValue[][], config: { type: DamageType, options: {} } }
 */
export function validateDamageRequest(req: Request): void {
  const { matrix, config } = req.body;

  requireMatrix(matrix);

  if (!config || typeof config !== "object") {
    throw new ApiError(400, '"config" must be an object', "config");
  }

  if (!VALID_DAMAGE_TYPES.has(config.type)) {
    throw new ApiError(
      400,
      `"config.type" must be one of: ${[...VALID_DAMAGE_TYPES].join(", ")}`,
      "config.type"
    );
  }

  if (config.type === "randomNoise") {
    const pct = config.options?.percentage;
    if (typeof pct !== "number" || pct < 0 || pct > 100) {
      throw new ApiError(
        400,
        '"config.options.percentage" must be a number between 0 and 100',
        "config.options.percentage"
      );
    }
    if (config.options?.seed !== undefined) {
      if (typeof config.options.seed !== "number" || !Number.isInteger(config.options.seed)) {
        throw new ApiError(
          400,
          '"config.options.seed" must be an integer if provided',
          "config.options.seed"
        );
      }
    }
  }
}

/**
 * POST /api/decode
 * Body: { matrix: ModuleValue[][], version?: number, ecLevel: 'L'|'M'|'Q'|'H' }
 */
export function validateDecodeRequest(req: Request): void {
  const { matrix, ecLevel, version } = req.body;

  requireMatrix(matrix);
  requireECLevel(ecLevel);

  if (version !== undefined) {
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || version > 40) {
      throw new ApiError(400, '"version" must be an integer between 1 and 40', "version");
    }
  }
}

/**
 * GET /api/generate/capacity
 * Query: { version: string, ecLevel: string, mode: string }
 */
export function validateCapacityRequest(req: Request): void {
  const { version, ecLevel, mode } = req.query;

  const v = Number(version);
  if (!Number.isInteger(v) || v < 1 || v > 40) {
    throw new ApiError(400, '"version" query param must be an integer 1–40', "version");
  }
  requireECLevel(ecLevel, "ecLevel");
  if (!VALID_MODES.has(mode as string)) {
    throw new ApiError(
      400,
      `"mode" must be one of: ${[...VALID_MODES].join(", ")}`,
      "mode"
    );
  }
}