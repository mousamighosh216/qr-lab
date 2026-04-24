// src/core/bitstream/builder.ts

import type { Bits, Mode } from "@qrlab/types";
import { encodeData } from "./modeEncoder";
import { InputAnalysis } from "../../types/index"

// ─── constants ───────────────────────────────────────────────────────────────

const ALPHA_SET = new Set(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:".split("")
);

const KANJI_RANGE_1 = { min: 0x8140, max: 0x9ffc };
const KANJI_RANGE_2 = { min: 0xe040, max: 0xebbf };

// ─── mode detection ──────────────────────────────────────────────────────────

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s);
}

function isAlphanumeric(s: string): boolean {
  return [...s].every((c) => ALPHA_SET.has(c));
}

/**
 * NOTE: This assumes input is already Shift-JIS encoded (or compatible binary form).
 * Full correctness depends on encodeData implementation.
 */
function isKanji(input: string): boolean {
  const buf = Buffer.from(input, "binary");

  if (buf.length % 2 !== 0) return false;

  for (let i = 0; i < buf.length; i += 2) {
    const code = (buf[i] << 8) | buf[i + 1];

    const inRange1 = code >= KANJI_RANGE_1.min && code <= KANJI_RANGE_1.max;
    const inRange2 = code >= KANJI_RANGE_2.min && code <= KANJI_RANGE_2.max;

    if (!inRange1 && !inRange2) return false;
  }

  return true;
}

// ─── estimation ──────────────────────────────────────────────────────────────

function estimateBits(input: string, mode: Mode): number {
  const n = input.length;

  switch (mode) {
    case "numeric": {
      const groups = Math.floor(n / 3);
      const rem = n % 3;
      return groups * 10 + (rem === 2 ? 7 : rem === 1 ? 4 : 0);
    }

    case "alphanumeric":
      return Math.floor(n / 2) * 11 + (n % 2) * 6;

    case "byte":
      return Buffer.byteLength(input, "utf8") * 8;

    case "kanji":
      return (n / 2) * 13; // each double-byte char → 13 bits
  }
}

// ─── analysis ────────────────────────────────────────────────────────────────

export function analyzeInput(input: string): InputAnalysis {
  if (!input.length) {
    throw new Error("Input must not be empty");
  }

  let mode: Mode;

  if (isNumeric(input)) {
    mode = "numeric";
  } else if (isAlphanumeric(input)) {
    mode = "alphanumeric";
  } else if (isKanji(input)) {
    mode = "kanji";
  } else {
    mode = "byte";
  }

  const characterCount =
    mode === "kanji" ? input.length / 2 : input.length;

  return {
    mode,
    characterCount,
    estimatedBitLength: estimateBits(input, mode),
  };
}

// ─── mode indicator ──────────────────────────────────────────────────────────

const MODE_INDICATOR: Record<Mode, Bits> = {
  numeric: [0, 0, 0, 1],
  alphanumeric: [0, 0, 1, 0],
  byte: [0, 1, 0, 0],
  kanji: [1, 0, 0, 0],
};

export function buildModeIndicator(mode: Mode): Bits {
  return [...MODE_INDICATOR[mode]];
}

// ─── character count indicator ───────────────────────────────────────────────

const CHAR_COUNT_BITS: Record<Mode, [number, number, number]> = {
  numeric: [10, 12, 14],
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
  kanji: [8, 10, 12],
};

export function buildCharacterCountIndicator(
  mode: Mode,
  version: number,
  count: number
): Bits {
  const [v1_9, v10_26, v27_40] = CHAR_COUNT_BITS[mode];

  const bitLength =
    version <= 9 ? v1_9 : version <= 26 ? v10_26 : v27_40;

  const bits: Bits = [];

  for (let i = bitLength - 1; i >= 0; i--) {
    bits.push((count >> i) & 1);
  }

  return bits;
}

// ─── bitstream builder ───────────────────────────────────────────────────────

export function buildBitstream(input: string, version: number): Bits {
  const analysis = analyzeInput(input);

  return [
    ...buildModeIndicator(analysis.mode),
    ...buildCharacterCountIndicator(
      analysis.mode,
      version,
      analysis.characterCount
    ),
    ...encodeData(input, analysis.mode),
  ];
}