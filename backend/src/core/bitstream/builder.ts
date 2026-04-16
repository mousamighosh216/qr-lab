// src/core/bitstream/builder.ts
// Phase 1: analyzeInput + selectVersion only.
// Phase 2 adds: buildModeIndicator, buildCharacterCountIndicator,
//               encodeData, buildBitstream.

import type { Mode } from "@qrlab/types";
import { selectVersion } from "../qr/version";
import type { InputAnalysis } from "../../types"

// ─── mode detection ───────────────────────────────────────────────────────────

// Characters valid in alphanumeric mode (45-char set from the QR standard)
const ALPHANUMERIC_CHARSET = new Set(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"
);

const KANJI_RANGE_1 = { min: 0x8140, max: 0x9ffc };
const KANJI_RANGE_2 = { min: 0xe040, max: 0xebbf };

/**
 * Returns true if every character in the string is a decimal digit.
 */
function isNumeric(input: string): boolean {
  return /^\d+$/.test(input);
}

/**
 * Returns true if every character is in the QR alphanumeric set
 * (digits, uppercase A–Z, space, $, %, *, +, -, ., /, :).
 */
function isAlphanumeric(input: string): boolean {
  return [...input].every((ch) => ALPHANUMERIC_CHARSET.has(ch));
}

/**
 * Returns true if the string can be encoded as Shift-JIS double-byte Kanji.
 * Checks both valid Shift-JIS ranges defined by the QR standard.
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

/**
 * Estimates the encoded bit length for an input at a given mode.
 * Used by analyzeInput to validate version selection.
 *
 * Note: character count indicators vary by version — this uses the
 * V1–V9 lengths as a conservative estimate during mode detection.
 * Phase 2 buildBitstream computes the exact length for the chosen version.
 */
function estimateBitLength(input: string, mode: Mode): number {
  const len = input.length;
  switch (mode) {
    case "numeric": {
      // Groups of 3 → 10 bits, remainder of 2 → 7 bits, remainder of 1 → 4 bits
      const groups = Math.floor(len / 3);
      const rem = len % 3;
      return groups * 10 + (rem === 2 ? 7 : rem === 1 ? 4 : 0);
    }
    case "alphanumeric": {
      // Pairs → 11 bits, single trailing → 6 bits
      return Math.floor(len / 2) * 11 + (len % 2) * 6;
    }
    case "byte": {
      // 8 bits per byte (UTF-8; multi-byte chars count as multiple bytes)
      return Buffer.byteLength(input, "utf8") * 8;
    }
    case "kanji": {
      // 13 bits per double-byte character
      return (len / 2) * 13;
    }
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Scans the input string and selects the most compact encoding mode.
 * Priority: numeric > alphanumeric > kanji > byte.
 *
 * Returns the detected mode, character count, and an estimated bit length
 * for the data body (excluding mode indicator and character count indicator —
 * those depend on version, which is determined in selectVersion).
 */
export function analyzeInput(input: string): InputAnalysis {
  if (input.length === 0) throw new Error("Input must not be empty");

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

  // Character count: for kanji, each double-byte pair = 1 character
  const characterCount = mode === "kanji" ? input.length / 2 : input.length;

  return {
    mode,
    characterCount,
    estimatedBitLength: estimateBitLength(input, mode),
  };
}