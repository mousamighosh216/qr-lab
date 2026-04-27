// packages/types/src/index.ts
// Single source of truth for all types shared between frontend and backend.
// Backend-only types (Block, EncodedBlock, etc.) stay in backend/src/types/.

// ─── core primitives ──────────────────────────────────────────────────────────

export type Bits = number[];

export type ModuleValue =
  | "BLACK"
  | "WHITE"
  | "EMPTY"
  | "RESERVED"
  | "ERASED"
  | "CORRUPTED"
  | "RECOVERED";

export type Matrix = ModuleValue[][];

export interface Coord { row: number; col: number; }
export interface Rect  { x: number; y: number; width: number; height: number; }

// ─── encoding ─────────────────────────────────────────────────────────────────

export type Mode    = "numeric" | "alphanumeric" | "byte" | "kanji";
export type ECLevel = "L" | "M" | "Q" | "H";

export interface ECBlockConfig {
  count:                number;
  dataCodewords:        number;
  ecCodewordsPerBlock:  number;
}

// ─── damage ───────────────────────────────────────────────────────────────────

export type DamageType =
  | "randomNoise"
  | "blockErase"
  | "burst"
  | "logoEmbed";

export interface DamageConfig {
  type:    DamageType;
  options: Record<string, unknown>;
}

export interface DamageMetadata {
  totalModules:   number;
  damagedModules: number;
  damagePercent:  number;
}

// ─── decode / recovery ────────────────────────────────────────────────────────

export type RecoveryTrace = Array<{
  blockIndex:      number;
  errorsDetected:  number;
  errorsCorrected: number;
  status:          "success" | "partial" | "failed";
}>;

export interface CorrectionSummary {
  totalErrors:   number;
  totalFailures: number;
  success:       boolean;
}

export interface DecodeResult {
  text:    string;
  success: boolean;
  trace:   RecoveryTrace;
  summary: CorrectionSummary;
}

// ─── simulation ───────────────────────────────────────────────────────────────

export interface ExperimentConfig {
  version:       number;
  ecLevel:       ECLevel;
  damageType:    DamageType;
  minPercent:    number;
  maxPercent:    number;
  steps:         number;
  trialsPerStep: number;
}

export interface DataPoint {
  damagePercent: number;
  successRate:   number;
  trials:        number;
}

export interface ExperimentResult {
  dataPoints: DataPoint[];
  config:     ExperimentConfig;
}

export interface ThresholdReport {
  threshold:  number;
  confidence: number;
  sampleSize: number;
}

export type HeatmapData = number[][];

// ─── API response shapes ──────────────────────────────────────────────────────
// These cross the wire — used by both the Express route handlers and api.ts.

export interface GenerateQRResult {
  matrix:        Matrix;
  version:       number;
  ecLevel:       ECLevel;
  mode:          Mode;
  bitstream:     number[];
  dataCodewords: number[];
  ecCodewords:   number[];
  blockConfig:   ECBlockConfig[];
  svgPreview:    string;
}

export interface CapacityResult {
  capacity: number;
}

export interface DamageResult {
  damagedMatrix: Matrix;
  metadata:      DamageMetadata;
  recoverabilityEstimate: {
    expectedSuccess: boolean;
    blocksAtRisk:    number[];
    confidence:      number;
  };
}

export interface ThresholdResult {
  dataPoints: DataPoint[];
  threshold:  ThresholdReport;
}

export interface SimulationStatusResult {
  status:          "queued" | "running" | "done" | "failed";
  progress:        number;
  partialResults?: DataPoint[] | null;
  result?:         ThresholdResult | any;
  error?:          string;
}

export interface HeatmapScanResult {
  jobId: string;
}