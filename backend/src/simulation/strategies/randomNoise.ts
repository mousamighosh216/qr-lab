// src/simulation/strategies/randomNoise.ts
// Applies uniformly distributed random module flips.
// Seed support makes every run deterministic — critical for reproducible experiments.

import type { Matrix, ModuleValue } from "@qrlab/types";

// ─── types ───────────────────────────────────────────────────────────────────

export interface RandomNoiseOptions {
  /** Percentage of modules to flip (0–100). */
  percentage: number;
  /** Optional seed for deterministic output. Omit for true randomness. */
  seed?: number;
}

// ─── seeded PRNG ─────────────────────────────────────────────────────────────
// Mulberry32 — fast, good distribution, 32-bit seed.
// Returns a function that generates floats in [0, 1).

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// ─── module eligibility ───────────────────────────────────────────────────────
// Function patterns and reserved regions must not be damaged —
// flipping a finder or format module guarantees decode failure
// regardless of EC level. The damage engine targets only data modules.

const FLIPPABLE: Set<ModuleValue> = new Set(["BLACK", "WHITE"]);

// ─── exports ─────────────────────────────────────────────────────────────────

/**
 * Generates a boolean mask indicating which module positions to flip.
 * Each position is independently sampled at probability = percentage / 100.
 *
 * Using the mask separately (without modifying the matrix) is useful for
 * live UI preview — render the mask overlay without committing damage yet.
 */
export function generateNoiseMask(
  rows: number,
  cols: number,
  percentage: number,
  seed?: number
): boolean[][] {
  if (percentage < 0 || percentage > 100) {
    throw new RangeError(`Noise percentage must be 0–100, got ${percentage}`);
  }

  const rand = seed !== undefined ? mulberry32(seed) : Math.random.bind(Math);
  const threshold = percentage / 100;

  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rand() < threshold)
  );
}

/**
 * Applies random noise to a matrix.
 * Only BLACK and WHITE modules are eligible — RESERVED, ERASED, EMPTY are skipped.
 *
 * Returns a new matrix (original is never mutated).
 */
export function applyRandomNoise(
  matrix: Matrix,
  options: RandomNoiseOptions
): Matrix {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  const mask = generateNoiseMask(rows, cols, options.percentage, options.seed);

  return matrix.map((row, r) =>
    row.map((cell, c) => {
      if (!mask[r][c] || !FLIPPABLE.has(cell)) return cell;
      // Flip: BLACK → CORRUPTED, WHITE → CORRUPTED
      // CORRUPTED is visually distinct from ERASED (position known vs unknown)
      return "CORRUPTED" as ModuleValue;
    })
  );
}