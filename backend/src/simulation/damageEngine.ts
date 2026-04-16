// src/simulation/damageEngine.ts
// Phase 1: randomNoise strategy only.
// Phase 2 adds: blockErase, burst, logoEmbed, estimateRecoverability.

import type { Matrix, ModuleValue, DamageConfig, DamageMetadata } from "@qrlab/types";
import { applyRandomNoise, RandomNoiseOptions } from "./strategies/randomNoise";

// ─── types ───────────────────────────────────────────────────────────────────

export interface DamagedMatrix {
  matrix: Matrix;
  metadata: DamageMetadata;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAMAGED_STATES: Set<ModuleValue> = new Set(["ERASED", "CORRUPTED"]);

/**
 * Counts damaged modules and returns structured metadata.
 * Works on any two matrices — original and result of any damage strategy.
 */
export function getDamageMetadata(
  original: Matrix,
  damaged: Matrix
): DamageMetadata {
  const totalModules = original.length * (original[0]?.length ?? 0);

  let damagedModules = 0;
  for (let r = 0; r < damaged.length; r++) {
    for (let c = 0; c < damaged[r].length; c++) {
      if (DAMAGED_STATES.has(damaged[r][c])) damagedModules++;
    }
  }

  return {
    totalModules,
    damagedModules,
    damagePercent: parseFloat(((damagedModules / totalModules) * 100).toFixed(2)),
  };
}

/**
 * Generates a plain-text damage report string for logging / API responses.
 */
export function generateDamageReport(metadata: DamageMetadata): string {
  return [
    `Total modules  : ${metadata.totalModules}`,
    `Damaged modules: ${metadata.damagedModules}`,
    `Damage %       : ${metadata.damagePercent.toFixed(2)}%`,
  ].join("\n");
}

// ─── main ────────────────────────────────────────────────────────────────────

/**
 * Applies the requested damage strategy to the matrix.
 * Returns a new matrix + metadata. The original matrix is never mutated.
 *
 * Phase 1 supports: randomNoise
 * Phase 2 adds   : blockErase, burst, logoEmbed
 */
export function applyDamage(
  matrix: Matrix,
  config: DamageConfig
): DamagedMatrix {
  let damaged: Matrix;

  switch (config.type) {
    case "randomNoise": {
      const opts = config.options as RandomNoiseOptions;
      damaged = applyRandomNoise(matrix, opts);
      break;
    }

    // Phase 2 stubs — throw clearly rather than silently producing wrong output
    case "blockErase":
    case "burst":
    case "logoEmbed":
      throw new Error(
        `Damage strategy "${config.type}" is not implemented yet (Phase 2).`
      );

    default:
      throw new Error(`Unknown damage type: "${(config as DamageConfig).type}"`);
  }

  return {
    matrix: damaged,
    metadata: getDamageMetadata(matrix, damaged),
  };
}