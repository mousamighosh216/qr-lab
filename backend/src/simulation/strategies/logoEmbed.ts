// src/simulation/strategies/logoEmbed.ts
// Erases a centered rectangular region to simulate logo embedding.
// ERASED state is used (not CORRUPTED) because the position is known —
// erasure decoding in the RS layer can handle it more efficiently.

import type { Matrix, ModuleValue, Rect, ECLevel } from "@qrlab/types";
import { getTotalECCodewords } from "../../core/qr/version";

// ─── types ────────────────────────────────────────────────────────────────────

export interface LogoOptions {
  centerRow: number;
  centerCol: number;
  width:     number;
  height:    number;
}

export interface LogoImpactReport {
  logoRegion:      Rect;
  erasedModules:   number;
  totalDataModules: number;
  erasurePercent:  number;
  likelyRecoverable: boolean;
  warning?:        string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const ERASABLE: Set<ModuleValue> = new Set(["BLACK", "WHITE"]);

// ─── embedLogo ────────────────────────────────────────────────────────────────

/**
 * Erases the rectangular region centered at (centerRow, centerCol).
 * Only BLACK and WHITE modules are changed — function patterns are left intact.
 * Returns a new matrix; original is never mutated.
 */
export function embedLogo(matrix: Matrix, options: LogoOptions): Matrix {
  const result = matrix.map((r) => [...r] as ModuleValue[]);
  const n      = result.length;
  const halfH  = Math.floor(options.height / 2);
  const halfW  = Math.floor(options.width  / 2);

  for (let r = options.centerRow - halfH; r <= options.centerRow + halfH; r++) {
    for (let c = options.centerCol - halfW; c <= options.centerCol + halfW; c++) {
      if (r >= 0 && r < n && c >= 0 && c < n && ERASABLE.has(result[r][c])) {
        result[r][c] = "ERASED";
      }
    }
  }

  return result;
}

// ─── getMaxSafeLogoSize ───────────────────────────────────────────────────────

/**
 * Returns the largest centered rectangle that stays within the theoretical
 * erasure correction capacity for this version + EC level.
 *
 * Approximation: each EC codeword can correct 1 erasure when positions are known.
 * We use 40% of EC codewords as a safety headroom (leaves room for unknown errors).
 */
export function getMaxSafeLogoSize(version: number, ecLevel: ECLevel): Rect {
  const n            = version * 4 + 17;
  const ecWords      = getTotalECCodewords(version, ecLevel);
  // ~8 modules per codeword × 40% safety headroom
  const maxArea      = Math.min(ecWords * 8 * 0.4, (n * n) * 0.3);
  const side         = Math.floor(Math.sqrt(maxArea));

  return {
    x:      Math.floor((n - side) / 2),
    y:      Math.floor((n - side) / 2),
    width:  side,
    height: side,
  };
}

// ─── analyzeLogoImpact ────────────────────────────────────────────────────────

/**
 * Analyses how many data modules a logo region would erase
 * and whether the result is likely still decodable.
 */
export function analyzeLogoImpact(
  matrix:     Matrix,
  logoRegion: Rect,
  version:    number,
  ecLevel:    ECLevel
): LogoImpactReport {
  const n = matrix.length;
  let erasedModules    = 0;
  let totalDataModules = 0;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!ERASABLE.has(matrix[r][c])) continue;
      totalDataModules++;
      if (
        r >= logoRegion.y && r < logoRegion.y + logoRegion.height &&
        c >= logoRegion.x && c < logoRegion.x + logoRegion.width
      ) {
        erasedModules++;
      }
    }
  }

  const safe            = getMaxSafeLogoSize(version, ecLevel);
  const safeArea        = safe.width * safe.height;
  const logoArea        = logoRegion.width * logoRegion.height;
  const likelyRecoverable = logoArea <= safeArea;
  const erasurePercent  = parseFloat(((erasedModules / totalDataModules) * 100).toFixed(2));

  return {
    logoRegion,
    erasedModules,
    totalDataModules,
    erasurePercent,
    likelyRecoverable,
    warning: likelyRecoverable
      ? undefined
      : `Logo (${logoRegion.width}×${logoRegion.height}) exceeds safe size ` +
        `(${safe.width}×${safe.height}) for V${version}-${ecLevel}. Decode may fail.`,
  };
}