// src/simulation/damageEngine.ts
// Orchestrates all damage strategies.
// Returns a new matrix + metadata — original is never mutated.

import type { Matrix, ModuleValue, DamageConfig, DamageMetadata, ECLevel } from "@qrlab/types";
import { applyRandomNoise } from "./strategies/randomNoise";
import type { RandomNoiseOptions } from "./strategies/randomNoise";
import { applyBlockErase, applyRandomBlock } from "./strategies/blockErase";
import type { BlockEraseOptions, RandomBlockOptions } from "./strategies/blockErase";
import { applyBurst, applyGaussianBlur, applyStructuredDistortion } from "./strategies/burstDistortion";
import type { BurstOptions, BlurOptions, DistortionOptions } from "./strategies/burstDistortion";
import { embedLogo, analyzeLogoImpact } from "./strategies/logoEmbed";
import type { LogoOptions } from "./strategies/logoEmbed";
import { getECBlockConfig } from "../core/qr/version";
import { getModuleRegionLabel } from "../utils/matrixUtils";

// ─── types ───────────────────────────────────────────────────────────────────

export interface DamagedMatrix {
  matrix:   Matrix;
  metadata: DamageMetadata;
}

export interface RecoverabilityEstimate {
  expectedSuccess: boolean;
  blocksAtRisk:    number[];
  confidence:      number;   // 0.0–1.0
}

export interface AffectedRegion {
  label:        string;
  moduleCount:  number;
  damagedCount: number;
  damagedPercent: number;
}

export interface DamageReport {
  totalModules:     number;
  damagedModules:   number;
  damagePercent:    number;
  affectedRegions:  AffectedRegion[];
  summary:          string;
}

// ─── internal constants ───────────────────────────────────────────────────────

const DAMAGED_STATES: Set<ModuleValue> = new Set(["ERASED", "CORRUPTED"]);

// Approximate theoretical correction limits per EC level
// as a percentage of total codewords that can be corrected
const EC_CAPACITY: Record<ECLevel, number> = {
  L: 7,
  M: 15,
  Q: 25,
  H: 30,
};

// ─── getDamageMetadata ────────────────────────────────────────────────────────

/**
 * Counts damaged modules and returns structured metadata.
 * Works on any two matrices — original and result of any damage strategy.
 *
 * @param original - The undamaged reference matrix
 * @param damaged  - The matrix after damage has been applied
 */
export function getDamageMetadata(
  original: Matrix,
  damaged:  Matrix
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

// ─── estimateRecoverability ───────────────────────────────────────────────────

/**
 * Estimates whether the damaged matrix is likely to decode successfully.
 *
 * Strategy:
 *   1. Calculate overall damage percentage
 *   2. Compare against the EC level's theoretical correction capacity
 *   3. Identify which RS block indices are likely over-capacity
 *      by checking whether damage is concentrated in specific column
 *      ranges that correspond to those blocks after de-interleaving
 *
 * This is a heuristic — the exact answer requires running the RS decoder.
 * Phase 3+ replaces this with syndrome-based analysis in corrector.ts.
 *
 * @param damaged  - The damaged matrix
 * @param version  - QR version (1–40)
 * @param ecLevel  - Error correction level
 */
export function estimateRecoverability(
  damaged:  Matrix,
  version:  number,
  ecLevel:  ECLevel
): RecoverabilityEstimate {
  const n            = damaged.length;
  const totalModules = n * n;

  // Count damaged data modules only (function patterns don't affect RS decoding)
  let damagedData  = 0;
  let totalData    = 0;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = damaged[r][c];
      // Only count modules that were originally data (not function patterns)
      if (cell === "BLACK" || cell === "WHITE" || DAMAGED_STATES.has(cell)) {
        const label = getModuleRegionLabel(r, c, version);
        if (label === "data") {
          totalData++;
          if (DAMAGED_STATES.has(cell)) damagedData++;
        }
      }
    }
  }

  const dataDamagePct  = totalData > 0 ? (damagedData / totalData) * 100 : 0;
  const limit          = EC_CAPACITY[ecLevel];
  const expectedSuccess = dataDamagePct < limit;

  // Identify blocks at risk
  // After interleaving, codewords from each block are spread across the bitstream.
  // We approximate block risk by dividing the data region into equal-width column bands
  // and checking which bands have above-capacity damage.
  const config      = getECBlockConfig(version, ecLevel);
  const totalBlocks = config.reduce((s, b) => s + b.count, 0);
  const blocksAtRisk: number[] = [];

  if (totalBlocks > 1) {
    // Divide columns into totalBlocks bands and check each
    const colBandWidth = Math.floor(n / totalBlocks);
    for (let b = 0; b < totalBlocks; b++) {
      const colStart = b * colBandWidth;
      const colEnd   = b === totalBlocks - 1 ? n : colStart + colBandWidth;

      let bandDamaged = 0;
      let bandTotal   = 0;

      for (let r = 0; r < n; r++) {
        for (let c = colStart; c < colEnd; c++) {
          const label = getModuleRegionLabel(r, c, version);
          if (label === "data") {
            bandTotal++;
            if (DAMAGED_STATES.has(damaged[r][c])) bandDamaged++;
          }
        }
      }

      if (bandTotal > 0 && (bandDamaged / bandTotal) * 100 > limit * 0.7) {
        blocksAtRisk.push(b);
      }
    }
  }

  // Confidence based on how far from the threshold we are
  const margin     = Math.abs(dataDamagePct - limit);
  const confidence = expectedSuccess
    ? Math.min(0.99, 0.6 + (margin / limit) * 0.4)
    : Math.min(0.99, 0.6 + (margin / (100 - limit)) * 0.4);

  return {
    expectedSuccess,
    blocksAtRisk,
    confidence: parseFloat(confidence.toFixed(3)),
  };
}

// ─── generateDamageReport ─────────────────────────────────────────────────────

/**
 * Formats damage statistics into a structured DamageReport.
 * Breaks down damage by region (finder, timing, format, data, etc.)
 * so the API response shows exactly where damage occurred.
 *
 * @param original - The undamaged reference matrix
 * @param damaged  - The matrix after damage has been applied
 * @param version  - QR version (needed for region labeling)
 */
export function generateDamageReport(
  original: Matrix,
  damaged:  Matrix,
  version:  number
): DamageReport {
  const metadata = getDamageMetadata(original, damaged);
  const n        = damaged.length;

  // Accumulate per-region counts
  const regionMap = new Map<string, { total: number; damaged: number }>();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const orig  = original[r][c];
      const dmg   = damaged[r][c];
      const label = getModuleRegionLabel(r, c, version);

      const existing = regionMap.get(label) ?? { total: 0, damaged: 0 };
      regionMap.set(label, {
        total:   existing.total + 1,
        damaged: existing.damaged + (DAMAGED_STATES.has(dmg) ? 1 : 0),
      });
    }
  }

  const affectedRegions: AffectedRegion[] = Array.from(regionMap.entries())
    .filter(([, { damaged }]) => damaged > 0)
    .map(([label, { total, damaged }]) => ({
      label,
      moduleCount:    total,
      damagedCount:   damaged,
      damagedPercent: parseFloat(((damaged / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.damagedCount - a.damagedCount);

  const summary = [
    `Total modules  : ${metadata.totalModules}`,
    `Damaged modules: ${metadata.damagedModules}`,
    `Damage %       : ${metadata.damagePercent.toFixed(2)}%`,
    affectedRegions.length > 0
      ? `Affected regions: ${affectedRegions.map(r => `${r.label} (${r.damagedCount})`).join(", ")}`
      : "No modules damaged",
  ].join("\n");

  return {
    totalModules:    metadata.totalModules,
    damagedModules:  metadata.damagedModules,
    damagePercent:   metadata.damagePercent,
    affectedRegions,
    summary,
  };
}

// ─── applyDamage ─────────────────────────────────────────────────────────────

/**
 * Routes to the correct damage strategy based on config.type.
 * Returns a new matrix + metadata. The original matrix is never mutated.
 *
 * Supported types:
 *   randomNoise — uniform random module flips (seed optional for determinism)
 *   blockErase  — erases rectangular regions; random placement if no `regions` given
 *   burst       — scratch/smear along a line; blur or distortion variants
 *   logoEmbed   — erases a centered rectangular logo region
 */
export function applyDamage(
  matrix: Matrix,
  config: DamageConfig
): DamagedMatrix {
  let damaged: Matrix;

  switch (config.type) {
    case "randomNoise": {
      damaged = applyRandomNoise(matrix, config.options as unknown as RandomNoiseOptions);
      break;
    }

    case "blockErase": {
      const opts = config.options as unknown as BlockEraseOptions & RandomBlockOptions;
      damaged = (opts as BlockEraseOptions).regions
        ? applyBlockErase(matrix, opts as BlockEraseOptions)
        : applyRandomBlock(matrix, opts as RandomBlockOptions);
      break;
    }

    case "burst": {
      const opts = config.options as unknown as BurstOptions & BlurOptions & DistortionOptions;
      if ((opts as BlurOptions).flipProbability !== undefined) {
        damaged = applyGaussianBlur(matrix, opts as BlurOptions);
      } else if (opts.type === "barrel" || opts.type === "pincushion") {
        damaged = applyStructuredDistortion(matrix, opts as DistortionOptions);
      } else {
        damaged = applyBurst(matrix, opts as BurstOptions);
      }
      break;
    }

    case "logoEmbed": {
      damaged = embedLogo(matrix, config.options as unknown as LogoOptions);
      break;
    }

    default:
      throw new Error(`Unknown damage type: "${(config as DamageConfig).type}"`);
  }

  return {
    matrix:   damaged,
    metadata: getDamageMetadata(matrix, damaged),
  };
}