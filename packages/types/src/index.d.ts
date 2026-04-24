export type Bits = number[];
export type Matrix = ModuleValue[][];
export type ModuleValue = 'BLACK' | 'WHITE' | 'EMPTY' | 'RESERVED' | 'ERASED' | 'CORRUPTED' | 'RECOVERED';
export type Coord = {
    row: number;
    col: number;
};
export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type Mode = 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
export type ECLevel = 'L' | 'M' | 'Q' | 'H';
export type DamageType = 'randomNoise' | 'blockErase' | 'burst' | 'logoEmbed';
export type DamageConfig = {
    type: DamageType;
    options: Record<string, unknown>;
};
export type DamageMetadata = {
    totalModules: number;
    damagedModules: number;
    damagePercent: number;
};
export type RecoveryTrace = {
    blockIndex: number;
    errorsDetected: number;
    errorsCorrected: number;
    status: 'success' | 'partial' | 'failed';
}[];
export type CorrectionSummary = {
    totalErrors: number;
    totalFailures: number;
    success: boolean;
};
export type DecodeResult = {
    text: string;
    success: boolean;
    trace: RecoveryTrace;
    summary: CorrectionSummary;
};
export type ExperimentConfig = {
    version: number;
    ecLevel: ECLevel;
    damageType: DamageType;
    minPercent: number;
    maxPercent: number;
    steps: number;
    trialsPerStep: number;
};
export type DataPoint = {
    damagePercent: number;
    successRate: number;
    trials: number;
};
export type ExperimentResult = {
    dataPoints: DataPoint[];
    config: ExperimentConfig;
};
export type ThresholdReport = {
    threshold: number;
    confidence: number;
    sampleSize: number;
};
export type HeatmapData = number[][];
export type ECBlockConfig = {
    count: number;
    dataCodewords: number;
    ecCodewordsPerBlock: number;
};
export type RecoverabilityEstimate = {
    expectedSuccess: boolean;
    blocksAtRisk: number[];
    confidence: number;
};
export type InputAnalysis = {
    mode: Mode;
    charCount: number;
    version: number;
    ecLevel: ECLevel;
};
export interface GenerateQRResult {
    matrix: Matrix;
    version: number;
    ecLevel: ECLevel;
    mode: Mode;
    bitstream: number[];
    dataCodewords: number[];
    ecCodewords: number[];
    blockConfig: ECBlockConfig[];
    svgPreview: string;
}
export interface CapacityResult {
    capacity: number;
}
export interface DamageResult {
    damagedMatrix: Matrix;
    metadata: DamageMetadata;
    recoverabilityEstimate: RecoverabilityEstimate;
}
export interface ThresholdResult {
    dataPoints: DataPoint[];
    threshold: ThresholdReport;
}
export interface SimulationStatusResult {
    status: 'queued' | 'running' | 'done' | 'failed';
    progress: number;
    partialResults?: null;
    result?: ThresholdResult;
    error?: string;
}
export interface HeatmapScanResult {
    jobId: string;
}
