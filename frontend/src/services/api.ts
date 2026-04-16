// src/services/api.ts
// Phase 1: generate, applyDamage, previewDamage, decodeMatrix use real endpoints.
// Simulation functions (runThresholdExperiment, getSimulationStatus, runHeatmapScan)
// stay as mocks until Phase 4.

import type {
  Matrix,
  ModuleValue,
  ECLevel,
  Mode,
  DamageConfig,
  DamageType,
  DamageMetadata,
  RecoveryTrace,
  DecodeResult,
  ExperimentConfig,
  DataPoint,
  ThresholdReport,
  GenerateQRResult,
  CapacityResult,
  DamageResult,
  ThresholdResult,
  SimulationStatusResult,
  HeatmapScanResult,
} from "@qrlab/types";

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// ─── internal fetch helper ────────────────────────────────────────────────────

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Try to parse a structured error from the API; fall back to status text
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── mock helpers (simulation only — Phases 4 & 5) ───────────────────────────

function delay(ms: number = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── generate ────────────────────────────────────────────────────────────────

/**
 * Generate a QR code from input text.
 *
 * @param input   - The text to encode
 * @param ecLevel - Error correction level: 'L' | 'M' | 'Q' | 'H'
 * @param version - Override version (1–40). Omit for auto-select.
 */
export async function generateQR(
  input: string,
  ecLevel: ECLevel = "M",
  version?: number
): Promise<GenerateQRResult> {
  return request<GenerateQRResult>("POST", "/api/generate", {
    input,
    ecLevel,
    ...(version !== undefined ? { version } : {}),
  });
}

/**
 * Get the maximum character capacity for a version + EC level + mode combination.
 */
export async function getCapacity(
  version: number,
  ecLevel: ECLevel,
  mode: Mode
): Promise<CapacityResult> {
  return request<CapacityResult>(
    "GET",
    `/api/generate/capacity?version=${version}&ecLevel=${ecLevel}&mode=${mode}`
  );
}

// ─── damage ───────────────────────────────────────────────────────────────────

/**
 * Apply damage to a matrix and commit the result to state.
 *
 * @param matrix  - The original QR matrix
 * @param config  - { type: DamageType, options: { percentage, seed?, ... } }
 * @param ecLevel - Current EC level (used for recoverability estimate)
 */
export async function applyDamage(
  matrix: Matrix,
  config: DamageConfig,
  ecLevel: ECLevel = "M"
): Promise<DamageResult> {
  return request<DamageResult>("POST", "/api/damage", { matrix, config, ecLevel });
}

/**
 * Preview damage without committing to state.
 * Identical payload to applyDamage — kept separate so the UI
 * can debounce slider changes without triggering state updates.
 */
export async function previewDamage(
  matrix: Matrix,
  config: DamageConfig,
  ecLevel: ECLevel = "M"
): Promise<DamageResult> {
  return request<DamageResult>("POST", "/api/damage/preview", { matrix, config, ecLevel });
}

// ─── decode ───────────────────────────────────────────────────────────────────

/**
 * Attempt to decode (and recover) a matrix.
 * Phase 1: returns text + success flag; trace is empty until Phase 3.
 *
 * @param matrix  - The (possibly damaged) QR matrix
 * @param version - QR version (1–40)
 * @param ecLevel - EC level used when the QR was generated
 */
export async function decodeMatrix(
  matrix: Matrix,
  version: number,
  ecLevel: ECLevel
): Promise<DecodeResult> {
  return request<DecodeResult>("POST", "/api/decode", { matrix, version, ecLevel });
}

// ─── simulate — threshold (mock until Phase 4) ───────────────────────────────

/**
 * Run a batch damage-threshold experiment.
 * Returns results inline for small configs; jobId for large ones.
 */
export async function runThresholdExperiment(
  config: ExperimentConfig
): Promise<{ jobId: string } | ThresholdResult> {
  await delay(800);

  const ecBreak: Record<ECLevel, number> = { L: 7, M: 15, Q: 25, H: 30 };
  const breakPoint = ecBreak[config.ecLevel] ?? 15;
  const stepSize = (config.maxPercent - config.minPercent) / Math.max(config.steps - 1, 1);

  const dataPoints: DataPoint[] = Array.from({ length: config.steps }, (_, i) => {
    const pct = config.minPercent + i * stepSize;
    const sr = pct < breakPoint
      ? 1 - pct / (breakPoint * 3)
      : Math.max(0, 1 - (pct - breakPoint) / 20);
    return {
      damagePercent: parseFloat(pct.toFixed(1)),
      successRate: parseFloat(Math.min(1, Math.max(0, sr)).toFixed(3)),
      trials: config.trialsPerStep,
    };
  });

  return {
    dataPoints,
    threshold: {
      threshold: breakPoint,
      confidence: 0.91,
      sampleSize: config.steps * config.trialsPerStep,
    },
  };

  // Phase 4 real implementation:
  // return request<{ jobId: string } | ThresholdResult>("POST", "/api/simulate/threshold", config);
}

// ─── simulate — status polling (mock until Phase 4) ──────────────────────────

/**
 * Poll the status of a queued simulation job.
 */
export async function getSimulationStatus(jobId: string): Promise<SimulationStatusResult> {
  await delay(200);

  const startTime = parseInt(jobId.split("-")[1] ?? "0", 10);
  const elapsed = Date.now() - startTime;

  if (elapsed < 2000) {
    return {
      status: "running",
      progress: Math.min(90, Math.floor(elapsed / 22)),
    };
  }

  return {
    status: "done",
    progress: 100,
    result: {
      dataPoints: [
        { damagePercent: 5,  successRate: 0.98, trials: 20 },
        { damagePercent: 10, successRate: 0.87, trials: 20 },
        { damagePercent: 15, successRate: 0.51, trials: 20 },
        { damagePercent: 20, successRate: 0.12, trials: 20 },
        { damagePercent: 25, successRate: 0.0,  trials: 20 },
      ],
      threshold: { threshold: 15, confidence: 0.89, sampleSize: 100 },
    },
  };

  // Phase 4 real implementation:
  // return request<SimulationStatusResult>("GET", `/api/simulate/status/${jobId}`);
}

// ─── simulate — heatmap (mock until Phase 5) ─────────────────────────────────

/**
 * Start a per-module criticality heatmap scan.
 * Always queued — returns a jobId immediately.
 */
export async function runHeatmapScan(
  _matrix: Matrix,
  _version: number,
  _ecLevel: ECLevel
): Promise<HeatmapScanResult> {
  await delay(300);
  return { jobId: `heatmap-${Date.now()}` };

  // Phase 5 real implementation:
  // return request<HeatmapScanResult>("POST", "/api/simulate/heatmap", { matrix: _matrix, version: _version, ecLevel: _ecLevel });
}