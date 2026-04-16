import { Mode } from "@qrlab/types";

// Internal to the RS encoding pipeline
// Frontend never receives a raw Block or EncodedBlock — it only sees
// the final decoded text and the summary/trace built from these
export type Block = { data: number[]; ec: number[] }
export type EncodedBlock = { data: number[]; ec: number[] }
export type DecodedBlock = { data: number[]; errorsFound: number; success: boolean }
export type CorrectionResult = { corrected: number[]; errorsFound: number; success: boolean }
export type ECBlockConfig = { count: number; dataCodewords: number; ecCodewordsPerBlock: number }

// InputAnalysis is computed inside builder.ts and consumed by padder.ts
// It never leaves the backend — the API response just returns version + mode as plain strings
export type InputAnalysis = { mode: Mode; characterCount: number; estimatedBitLength: number }