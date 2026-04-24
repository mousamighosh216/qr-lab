// src/analytics/thresholdDetector.ts
// Runs batch encode → damage → decode experiments to find fault-tolerance thresholds.
// Also builds per-module criticality heatmaps for the Analysis page (Phase 5).

import type { ECLevel, Matrix } from "@qrlab/types";
import type { ExperimentConfig, DataPoint, ExperimentResult, ThresholdReport } from "@qrlab/types";
import { analyzeInput, buildBitstream } from "../core/bitstream/builder";
import { pad, bitsToCodewords } from "../core/bitstream/padder";
import { selectVersion, getECBlockConfig } from "../core/qr/version";
import { createMatrix } from "../core/qr/matrix";
import {
  placeFinderPatterns, placeSeparators, placeTimingPatterns,
  placeAlignmentPatterns, placeDarkModule,
  reserveFormatRegions, reserveVersionRegions, placeDataModules,
} from "../core/qr/placement";
import { selectBestMask } from "../core/qr/mask";
import {
  encodeFormatString, writeFormatInfo,
  encodeVersionString, writeVersionInfo,
} from "../core/qr/format";
import { encodeBlock, interleaveBlocks } from "../core/errorCorrection/reedSolomon";
import { applyRandomNoise } from "../simulation/strategies/randomNoise";
import { applyBlockErase } from "../simulation/strategies/blockErase";
import { applyBurst } from "../simulation/strategies/burstDistortion";
import { readFormatInfo, inferVersion } from "../decoder/scanner";
import { removeMask, extractBitstream, separateBlocks } from "../decoder/extractor";
import { decodeBlocks } from "../decoder/corrector";
import type { DamageType } from "@qrlab/types";
import { getModuleRegionLabel } from "../utils/matrixUtils";

// ─── types ────────────────────────────────────────────────────────────────────

export interface RegionAnalysis {
  regionLabel: string;
  moduleCount: number;
  avgCriticality: number;
  maxCriticality: number;
}

export type HeatmapData = number[][];

export interface ExperimentProgress {
  step:          number;
  totalSteps:    number;
  currentDamage: number;
  partialResults: DataPoint[];
}

// ─── internal encode/decode ───────────────────────────────────────────────────

const ENCODE_INPUT = "QRLAB EXPERIMENT PAYLOAD 12345"; // fixed payload for batch runs

/**
 * Builds a fresh QR matrix for a given version + EC level.
 * Cached after first build per (version, ecLevel) pair to avoid
 * re-running the full pipeline on every trial.
 */
const matrixCache = new Map<string, Matrix>();

function buildBaseMatrix(version: number, ecLevel: ECLevel): Matrix {
  const key = `${version}-${ecLevel}`;
  if (matrixCache.has(key)) {
    // Deep clone so damage doesn't mutate the cache
    return matrixCache.get(key)!.map((r) => [...r]);
  }

  const analysis = analyzeInput(ENCODE_INPUT);
  const padded   = pad(buildBitstream(ENCODE_INPUT, version), version, ecLevel);
  const data     = bitsToCodewords(padded);
  const config   = getECBlockConfig(version, ecLevel);

  const encoded: ReturnType<typeof encodeBlock>[] = [];
  let offset = 0;
  for (const { count, dataCodewords: len, ecCodewordsPerBlock: ec } of config) {
    for (let i = 0; i < count; i++) {
      encoded.push(encodeBlock(data.slice(offset, offset + len), ec));
      offset += len;
    }
  }

  const bits = interleaveBlocks(encoded).flatMap((b) => {
    const out: number[] = [];
    for (let i = 7; i >= 0; i--) out.push((b >> i) & 1);
    return out;
  });

  const matrix = createMatrix(version);
  placeFinderPatterns(matrix);
  placeSeparators(matrix);
  placeTimingPatterns(matrix);
  placeAlignmentPatterns(matrix, version);
  placeDarkModule(matrix, version);
  reserveFormatRegions(matrix);
  reserveVersionRegions(matrix, version);
  placeDataModules(matrix, bits);

  const { maskId, maskedMatrix } = selectBestMask(matrix);
  writeFormatInfo(maskedMatrix, encodeFormatString(ecLevel, maskId));
  if (version >= 7) writeVersionInfo(maskedMatrix, encodeVersionString(version), version);

  matrixCache.set(key, maskedMatrix.map((r) => [...r]));
  return maskedMatrix;
}

function tryDecode(matrix: Matrix, version: number, ecLevel: ECLevel): boolean {
  try {
    const fi       = readFormatInfo(matrix) ?? { ecLevel, maskId: 0 };
    const unmasked = removeMask(matrix, fi.maskId);
    const bits     = extractBitstream(unmasked);
    const blocks   = separateBlocks(bits, version, ecLevel);
    const result   = decodeBlocks(blocks, version, ecLevel);
    return result.success;
  } catch {
    return false;
  }
}

function applyDamageForType(
  matrix:     Matrix,
  damageType: DamageType,
  percentage: number,
  seed:       number
): Matrix {
  const n = matrix.length;
  switch (damageType) {
    case "randomNoise":
      return applyRandomNoise(matrix, { percentage, seed }) as Matrix;
    case "blockErase":
      return applyBlockErase(matrix, {
        regions: [{
          x: Math.floor(n * 0.3),
          y: Math.floor(n * 0.3),
          width:  Math.floor(n * (percentage / 100) * 2),
          height: Math.floor(n * (percentage / 100) * 2),
        }],
      }) as Matrix;
    case "burst":
      return applyBurst(matrix, {
        angle:    45,
        length:   Math.floor(n * (percentage / 50)),
        width:    2,
        startRow: Math.floor(n * 0.2),
        startCol: Math.floor(n * 0.1),
      }) as Matrix;
    default:
      return applyRandomNoise(matrix, { percentage, seed }) as Matrix;
  }
}

// ─── main experiment ──────────────────────────────────────────────────────────

/**
 * Runs a batch damage-threshold experiment.
 *
 * For each damage level from minPercent to maxPercent (in `steps` increments):
 *   - Runs `trialsPerStep` trials
 *   - Each trial: build base matrix → apply damage → attempt decode
 *   - Records success rate for that damage level
 *
 * onProgress is called after each step — used by the worker to emit partial results.
 */
export function runDamageThresholdExperiment(
  config:     ExperimentConfig,
  onProgress?: (progress: ExperimentProgress) => void
): ExperimentResult {
  const {
    version, ecLevel, damageType,
    minPercent, maxPercent, steps, trialsPerStep,
  } = config;

  const stepSize    = steps > 1 ? (maxPercent - minPercent) / (steps - 1) : 0;
  const dataPoints: DataPoint[] = [];

  for (let s = 0; s < steps; s++) {
    const damagePercent = parseFloat((minPercent + s * stepSize).toFixed(1));
    let successes = 0;

    for (let t = 0; t < trialsPerStep; t++) {
      const seed   = s * 1000 + t; // deterministic per step+trial
      const base   = buildBaseMatrix(version, ecLevel);
      const damaged = applyDamageForType(base, damageType, damagePercent, seed);
      if (tryDecode(damaged, version, ecLevel)) successes++;
    }

    const dataPoint: DataPoint = {
      damagePercent,
      successRate: parseFloat((successes / trialsPerStep).toFixed(4)),
      trials:      trialsPerStep,
    };

    dataPoints.push(dataPoint);

    onProgress?.({
      step:           s + 1,
      totalSteps:     steps,
      currentDamage:  damagePercent,
      partialResults: [...dataPoints],
    });
  }

  return { dataPoints, config };
}

// ─── threshold detection ──────────────────────────────────────────────────────

/**
 * Finds the damage percentage where success rate first drops below 50%.
 * Uses linear interpolation between the two adjacent data points for precision.
 */
export function detectThreshold(results: ExperimentResult): ThresholdReport {
  const { dataPoints } = results;
  const sampleSize = dataPoints.reduce((s, d) => s + d.trials, 0);

  for (let i = 0; i < dataPoints.length - 1; i++) {
    const a = dataPoints[i];
    const b = dataPoints[i + 1];

    if (a.successRate >= 0.5 && b.successRate < 0.5) {
      // Linear interpolation: find the exact x where successRate = 0.5
      const slope     = (b.successRate - a.successRate) / (b.damagePercent - a.damagePercent);
      const threshold = a.damagePercent + (0.5 - a.successRate) / slope;

      // Confidence based on sample size and steepness of the drop
      const steepness  = Math.abs(a.successRate - b.successRate);
      const confidence = Math.min(0.99, 0.7 + steepness * 0.5 + Math.log10(sampleSize / 10) * 0.05);

      return {
        threshold:  parseFloat(threshold.toFixed(2)),
        confidence: parseFloat(confidence.toFixed(3)),
        sampleSize,
      };
    }
  }

  // Never crossed 50% — either always succeeds or always fails
  const allSuccess = dataPoints.every((d) => d.successRate >= 0.5);
  return {
    threshold:  allSuccess ? results.config.maxPercent : results.config.minPercent,
    confidence: 0.5,
    sampleSize,
  };
}

// ─── heatmap ─────────────────────────────────────────────────────────────────

/**
 * Builds a per-module criticality heatmap.
 *
 * Algorithm:
 *   For each BLACK/WHITE module at (r, c):
 *     - Clone the base matrix
 *     - Force that module to ERASED
 *     - Attempt decode
 *     - criticality[r][c] = 1 if decode failed, 0 if it still succeeded
 *
 * Returns a 2D float array matching the matrix dimensions.
 * onProgress called after each row to allow worker progress reporting.
 *
 * NOTE: This is O(N²) decodes. For V10+ it can take several minutes.
 * Always run in the worker queue, never inline in a request.
 */
export function buildHeatmap(
  version:    number,
  ecLevel:    ECLevel,
  onProgress?: (row: number, total: number) => void
): HeatmapData {
  const n        = version * 4 + 17;
  const heatmap: HeatmapData = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const base = buildBaseMatrix(version, ecLevel);
      const cell = base[r][c];

      // Only probe data modules — function patterns are always critical
      if (cell !== "BLACK" && cell !== "WHITE") {
        const label = getModuleRegionLabel(r, c, version);
        // Mark function patterns as max criticality without probing
        if (label !== "data") {
          heatmap[r][c] = label === "finder" || label === "format" ? 1.0 : 0.7;
          continue;
        }
      }

      // Erase the module and test decode
      const probed = base.map((row, ri) =>
        row.map((cell, ci): any => (ri === r && ci === c ? "ERASED" : cell))
      );

      heatmap[r][c] = tryDecode(probed, version, ecLevel) ? 0 : 1;
    }
    onProgress?.(r + 1, n);
  }

  return heatmap;
}

/**
 * Groups high-criticality modules by region label and returns a ranked summary.
 */
export function analyzeSensitiveRegions(
  heatmap: HeatmapData,
  version: number
): RegionAnalysis[] {
  const n = heatmap.length;
  const regionMap = new Map<string, { total: number; count: number; max: number }>();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const label = getModuleRegionLabel(r, c, version);
      const score = heatmap[r][c];
      const existing = regionMap.get(label) ?? { total: 0, count: 0, max: 0 };
      regionMap.set(label, {
        total: existing.total + score,
        count: existing.count + 1,
        max:   Math.max(existing.max, score),
      });
    }
  }

  return Array.from(regionMap.entries())
    .map(([regionLabel, { total, count, max }]) => ({
      regionLabel,
      moduleCount:    count,
      avgCriticality: parseFloat((total / count).toFixed(4)),
      maxCriticality: max,
    }))
    .sort((a, b) => b.avgCriticality - a.avgCriticality);
}