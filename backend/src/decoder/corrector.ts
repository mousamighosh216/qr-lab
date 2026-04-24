// src/decoder/corrector.ts
import type { ECLevel, DecodeResult, RecoveryTrace } from "@qrlab/types";
import { getECBlockConfig } from "../core/qr/version";
import { correctAllBlocks, reconstructMessage, type Block, type CorrectedBlock } from "../core/errorCorrection/reedSolomon";
import { decodeMessage } from "./extractor";

export function getRecoveryTrace(blocks: CorrectedBlock[]): RecoveryTrace {
  return blocks.map(b => ({
    blockIndex:      b.blockIndex,
    errorsDetected:  b.errorsFound,
    errorsCorrected: b.errorsCorrected,
    status:          b.status,
  }));
}

export interface FullDecodeResult extends DecodeResult {
  correctionSummary: { totalErrors: number; totalFailures: number; success: boolean; };
}

export function decodeBlocks(blocks: Block[], version: number, ecLevel: ECLevel): FullDecodeResult {
  const config  = getECBlockConfig(version, ecLevel);
  const summary = correctAllBlocks(blocks, config);
  const trace   = getRecoveryTrace(summary.blocks);

  if (!summary.success) {
    return { text:"", success:false, trace, summary:{ totalErrors:summary.totalErrors, totalFailures:summary.totalFailures, success:false }, correctionSummary:{ totalErrors:summary.totalErrors, totalFailures:summary.totalFailures, success:false } };
  }

  const dataBytes = reconstructMessage(summary.blocks);
  const { text }  = decodeMessage(dataBytes, version);

  return { text, success:true, trace, summary:{ totalErrors:summary.totalErrors, totalFailures:0, success:true }, correctionSummary:{ totalErrors:summary.totalErrors, totalFailures:0, success:true } };
}