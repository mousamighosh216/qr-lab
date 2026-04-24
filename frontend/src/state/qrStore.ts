// src/state/qrStore.ts
import { create } from "zustand";
import type {
  Matrix, ECLevel, Mode,
  DecodeResult, RecoveryTrace,
} from "@qrlab/types";
import type { GenerateQRResult, DamageResult } from "@qrlab/types";

interface QRState {
  // Input
  input:   string;
  ecLevel: ECLevel;
  setInput:   (input: string)   => void;
  setECLevel: (level: ECLevel)  => void;

  // Generated QR
  matrix:        Matrix | null;
  version:       number | null;
  mode:          Mode | null;
  bitstream:     number[];
  dataCodewords: number[];
  ecCodewords:   number[];
  blockConfig:   GenerateQRResult["blockConfig"];
  svgPreview:    string | null;
  setGeneratedQR: (qr: GenerateQRResult) => void;

  // Damage
  damagedMatrix:          Matrix | null;
  damageMetadata:         DamageResult["metadata"] | null;
  recoverabilityEstimate: DamageResult["recoverabilityEstimate"] | null;
  setDamagedMatrix: (result: DamageResult) => void;

  // Decode
  decodedText:       string | null;
  recoveryTrace:     RecoveryTrace;
  correctionSummary: DecodeResult["summary"] | null;
  setDecodeResult: (result: DecodeResult) => void;

  // Reset
  resetAll: () => void;
}

const useQRStore = create<QRState>((set) => ({
  input:   "",
  ecLevel: "M",
  setInput:   (input)   => set({ input }),
  setECLevel: (ecLevel) => set({ ecLevel }),

  matrix:        null,
  version:       null,
  mode:          null,
  bitstream:     [],
  dataCodewords: [],
  ecCodewords:   [],
  blockConfig:   [],
  svgPreview:    null,

  setGeneratedQR: (qr) =>
    set({
      matrix:        qr.matrix,
      version:       qr.version,
      ecLevel:       qr.ecLevel,
      mode:          qr.mode,
      bitstream:     qr.bitstream,
      dataCodewords: qr.dataCodewords,
      ecCodewords:   qr.ecCodewords,
      blockConfig:   qr.blockConfig,
      svgPreview:    qr.svgPreview,
      damagedMatrix:          null,
      damageMetadata:         null,
      recoverabilityEstimate: null,
      recoveryTrace:          [],
      correctionSummary:      null,
      decodedText:            null,
    }),

  damagedMatrix:          null,
  damageMetadata:         null,
  recoverabilityEstimate: null,

  setDamagedMatrix: (result) =>
    set({
      damagedMatrix:          result.damagedMatrix,
      damageMetadata:         result.metadata,
      recoverabilityEstimate: result.recoverabilityEstimate,
      recoveryTrace:          [],
      correctionSummary:      null,
      decodedText:            null,
    }),

  decodedText:       null,
  recoveryTrace:     [],
  correctionSummary: null,

  setDecodeResult: (result) =>
    set({
      decodedText:       result.text,
      recoveryTrace:     result.trace ?? [],
      correctionSummary: result.summary ?? null,
    }),

  resetAll: () =>
    set({
      input: "", ecLevel: "M",
      matrix: null, version: null, mode: null,
      bitstream: [], dataCodewords: [], ecCodewords: [], blockConfig: [], svgPreview: null,
      damagedMatrix: null, damageMetadata: null, recoverabilityEstimate: null,
      decodedText: null, recoveryTrace: [], correctionSummary: null,
    }),
}));

export default useQRStore;