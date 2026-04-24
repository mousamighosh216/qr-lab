// src/utils/matrixUtils.ts
// Matrix utility functions used across the backend:
//   - ASCII debug printing
//   - SVG preview generation
//   - ImageData pixel buffer conversion
//   - Coordinate helpers
//   - Per-module region labeling (finder / timing / format / data / etc.)

import type { Matrix, ModuleValue, Coord, Rect } from "@qrlab/types";
import { getAlignmentPatternCenters, getModuleCount } from "../core/qr/version";

// ─── types ────────────────────────────────────────────────────────────────────

export type RegionLabel =
  | "finder"
  | "separator"
  | "timing"
  | "alignment"
  | "format"
  | "version"
  | "dark"
  | "data"
  | "unknown";

export interface SimpleImageData {
  data:   Uint8ClampedArray;
  width:  number;
  height: number;
}

// ─── ASCII debug ──────────────────────────────────────────────────────────────

const MODULE_CHAR: Record<ModuleValue, string> = {
  BLACK:     "█",
  WHITE:     "·",
  EMPTY:     " ",
  RESERVED:  "R",
  ERASED:    "X",
  CORRUPTED: "?",
  RECOVERED: "O",
};

/**
 * Returns an ASCII representation of the matrix for terminal debugging.
 * Useful for verifying placement logic without rendering to canvas.
 *
 * Example output for a V1 finder corner:
 *   ███████
 *   █·····█
 *   █·███·█
 */
export function printMatrix(matrix: Matrix): string {
  return matrix
    .map((row) => row.map((m) => MODULE_CHAR[m] ?? "?").join(""))
    .join("\n");
}

// ─── SVG preview ─────────────────────────────────────────────────────────────

/**
 * Renders a Matrix as a compact inline SVG string.
 *
 * Only BLACK modules are drawn as filled rects — the background is white.
 * The SVG viewBox matches the matrix dimensions exactly.
 *
 * @param matrix      - The QR matrix to render
 * @param moduleSize  - SVG units per module (default 1 — scale via CSS/width attr)
 * @param colorMap    - Optional override for module colors
 */
export function matrixToSVG(
  matrix:    Matrix,
  moduleSize = 1,
  colorMap?: Partial<Record<ModuleValue, string>>
): string {
  const n    = matrix.length;
  const size = n * moduleSize;

  const defaultColors: Record<ModuleValue, string | null> = {
    BLACK:     "#000000",
    WHITE:     null,        // white on white background — skip
    EMPTY:     null,
    RESERVED:  "#b0b0ff",
    ERASED:    "#ff4444",
    CORRUPTED: "#ff9900",
    RECOVERED: "#22cc66",
  };

  const colors = { ...defaultColors, ...colorMap };
  const rects: string[] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell  = matrix[r][c];
      const color = colors[cell];
      if (!color) continue; // skip transparent modules

      rects.push(
        `<rect x="${c * moduleSize}" y="${r * moduleSize}" ` +
        `width="${moduleSize}" height="${moduleSize}" fill="${color}"/>`
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${size} ${size}" ` +
    `width="${size}" height="${size}" ` +
    `style="background:white;display:block">` +
    rects.join("") +
    `</svg>`
  );
}

// ─── ImageData pixel buffer conversion ───────────────────────────────────────

const MODULE_COLOR: Record<ModuleValue, [number, number, number]> = {
  BLACK:     [0,   0,   0  ],
  WHITE:     [255, 255, 255],
  EMPTY:     [255, 255, 255],
  RESERVED:  [180, 180, 255],
  ERASED:    [255, 100, 100],
  CORRUPTED: [255, 165,   0],
  RECOVERED: [100, 200, 100],
};

/**
 * Renders a Matrix into a flat RGBA Uint8ClampedArray pixel buffer.
 * Each module occupies a moduleSize × moduleSize square of pixels.
 *
 * Used by the decode route to convert a Matrix to an image buffer
 * for pixel-based processing, and by matrixRenderer.js on the frontend.
 *
 * @param matrix      - The QR matrix
 * @param moduleSize  - Pixels per module
 */
export function matrixToImageData(matrix: Matrix, moduleSize: number): SimpleImageData {
  const n    = matrix.length;
  const size = n * moduleSize;
  const data = new Uint8ClampedArray(size * size * 4);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const [red, green, blue] = MODULE_COLOR[matrix[r][c]] ?? [200, 200, 200];

      for (let pr = 0; pr < moduleSize; pr++) {
        for (let pc = 0; pc < moduleSize; pc++) {
          const px = ((r * moduleSize + pr) * size + (c * moduleSize + pc)) * 4;
          data[px]     = red;
          data[px + 1] = green;
          data[px + 2] = blue;
          data[px + 3] = 255; // fully opaque
        }
      }
    }
  }

  return { data, width: size, height: size };
}

/**
 * Samples a flat RGBA pixel buffer back into a Matrix.
 * Samples the center pixel of each module cell.
 * Luminance < 128 → BLACK, otherwise → WHITE.
 *
 * @param imageData   - Pixel buffer (from canvas or camera frame)
 * @param version     - QR version (determines expected module count)
 */
export function imageDataToMatrix(imageData: SimpleImageData, version: number): Matrix {
  const n          = getModuleCount(version);
  const moduleSize = imageData.width / n;
  const matrix: Matrix = [];

  for (let r = 0; r < n; r++) {
    const row: ModuleValue[] = [];
    for (let c = 0; c < n; c++) {
      // Sample the center of this module's pixel block
      const px  = Math.floor((c + 0.5) * moduleSize);
      const py  = Math.floor((r + 0.5) * moduleSize);
      const idx = (py * imageData.width + px) * 4;

      const R   = imageData.data[idx]     ?? 255;
      const G   = imageData.data[idx + 1] ?? 255;
      const B   = imageData.data[idx + 2] ?? 255;
      const lum = 0.299 * R + 0.587 * G + 0.114 * B;

      row.push(lum < 128 ? "BLACK" : "WHITE");
    }
    matrix.push(row);
  }

  return matrix;
}

// ─── coordinate helpers ───────────────────────────────────────────────────────

/**
 * Returns true if the coordinate falls inside the rectangle.
 * Uses canvas convention: x = column, y = row.
 */
export function coordsInRegion(coord: Coord, region: Rect): boolean {
  return (
    coord.col >= region.x &&
    coord.col <  region.x + region.width &&
    coord.row >= region.y &&
    coord.row <  region.y + region.height
  );
}

/**
 * Clamps a coordinate to the valid range of the matrix.
 */
export function clampCoord(coord: Coord, matrixSize: number): Coord {
  return {
    row: Math.max(0, Math.min(matrixSize - 1, coord.row)),
    col: Math.max(0, Math.min(matrixSize - 1, coord.col)),
  };
}

/**
 * Returns all coordinates in a rectangular region, clipped to matrix bounds.
 */
export function getCoordsInRegion(region: Rect, matrixSize: number): Coord[] {
  const coords: Coord[] = [];
  const maxR = Math.min(region.y + region.height, matrixSize);
  const maxC = Math.min(region.x + region.width,  matrixSize);
  for (let r = Math.max(0, region.y); r < maxR; r++) {
    for (let c = Math.max(0, region.x); c < maxC; c++) {
      coords.push({ row: r, col: c });
    }
  }
  return coords;
}

// ─── region labeling ──────────────────────────────────────────────────────────

/**
 * Returns the functional region label for the module at (row, col).
 *
 * Used by:
 *   - The heatmap engine to assign known criticality to function patterns
 *   - The visualization engine to color-code modules in MatrixViewer
 *   - The recovery trace to annotate which regions were affected by damage
 *
 * Label hierarchy (checked in this order):
 *   finder → separator → timing → dark → format → version → alignment → data
 *
 * @param row     - Module row (0-indexed from top)
 * @param col     - Module column (0-indexed from left)
 * @param version - QR version (1–40)
 */
export function getModuleRegionLabel(
  row:     number,
  col:     number,
  version: number
): RegionLabel {
  const n = getModuleCount(version);

  // ── Finder patterns ───────────────────────────────────────────────────────
  // Three 7×7 corner patterns: top-left, top-right, bottom-left
  if (
    (row < 7 && col < 7)         ||  // top-left
    (row < 7 && col >= n - 7)    ||  // top-right
    (row >= n - 7 && col < 7)        // bottom-left
  ) return "finder";

  // ── Separators ────────────────────────────────────────────────────────────
  // 1-module white borders around each finder pattern
  if (
    (row === 7 && col <= 7)       ||  // TL horizontal
    (col === 7 && row <= 7)       ||  // TL vertical
    (row === 7 && col >= n - 8)   ||  // TR horizontal
    (row <= 7 && col === n - 8)   ||  // TR vertical
    (row >= n - 8 && col === 7)   ||  // BL horizontal
    (row === n - 8 && col <= 7)       // BL vertical
  ) return "separator";

  // ── Timing patterns ───────────────────────────────────────────────────────
  // Alternating black/white strips on row 6 and col 6
  if (row === 6 || col === 6) return "timing";

  // ── Dark module ───────────────────────────────────────────────────────────
  // Single forced-black module at (4*version + 9, 8)
  if (row === 4 * version + 9 && col === 8) return "dark";

  // ── Format information ────────────────────────────────────────────────────
  // Two copies of the 15-bit format string:
  //   Copy 1: adjacent to top-left finder (row 8 cols 0–8, col 8 rows 0–8)
  //   Copy 2: top-right (row 8 cols n-8..n-1), bottom-left (col 8 rows n-7..n-1)
  if (
    (row === 8 && col <= 8)       ||  // TL copy horizontal
    (col === 8 && row <= 8)       ||  // TL copy vertical
    (row === 8 && col >= n - 8)   ||  // TR copy
    (col === 8 && row >= n - 7)       // BL copy
  ) return "format";

  // ── Version information (V7+) ─────────────────────────────────────────────
  // Two 6×3 blocks near the top-right and bottom-left finders
  if (version >= 7) {
    if (row < 6 && col >= n - 11 && col < n - 8) return "version"; // top-right block
    if (row >= n - 11 && row < n - 8 && col < 6) return "version"; // bottom-left block
  }

  // ── Alignment patterns ────────────────────────────────────────────────────
  // 5×5 patterns at positions defined per version
  const centers = getAlignmentPatternCenters(version);
  if (centers.length > 0) {
    for (const cr of centers) {
      for (const cc of centers) {
        if (Math.abs(row - cr) <= 2 && Math.abs(col - cc) <= 2) {
          return "alignment";
        }
      }
    }
  }

  // ── Data modules ──────────────────────────────────────────────────────────
  // Everything else is part of the encoded data + EC codewords
  return "data";
}

/**
 * Returns all coordinates in the matrix that belong to a specific region.
 * Useful for building region-specific heatmap overlays.
 */
export function getRegionCoords(
  region:  RegionLabel,
  version: number
): Coord[] {
  const n      = getModuleCount(version);
  const coords: Coord[] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (getModuleRegionLabel(r, c, version) === region) {
        coords.push({ row: r, col: c });
      }
    }
  }

  return coords;
}

/**
 * Returns a summary of how many modules belong to each region label.
 * Used by the analysis page region breakdown table.
 */
export function getRegionSummary(version: number): Record<RegionLabel, number> {
  const n = getModuleCount(version);
  const summary: Record<RegionLabel, number> = {
    finder:    0,
    separator: 0,
    timing:    0,
    alignment: 0,
    format:    0,
    version:   0,
    dark:      0,
    data:      0,
    unknown:   0,
  };

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      summary[getModuleRegionLabel(r, c, version)]++;
    }
  }

  return summary;
}