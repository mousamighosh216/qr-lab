// src/api/routes/decode.ts
// Phase 1: converts Matrix → pixel buffer → runs jsQR → returns result.
// Phase 3: replaces jsQR with our custom scanner → extractor → corrector pipeline
//          and adds the full RecoveryTrace to the response.

import { Router, Request, Response, NextFunction } from "express";
import jsQR from "jsqr";
import { createCanvas } from "canvas";
import type { Matrix, ModuleValue, ECLevel } from "@qrlab/types";
import type { DecodeResult } from "@qrlab/types";
import { validateDecodeRequest } from "../middleware/validate";

export const decodeRouter = Router();

// ─── constants ────────────────────────────────────────────────────────────────

// Module size in pixels when rendering the matrix to an image for jsQR.
// Must be large enough for jsQR's finder pattern detection.
const MODULE_PX = 10;

// Quiet zone (white border) around the QR in modules.
// jsQR requires at least 4 modules of quiet zone.
const QUIET_ZONE = 4;

// ─── matrix → ImageData ───────────────────────────────────────────────────────

const MODULE_COLOR: Record<ModuleValue, [number, number, number]> = {
  BLACK:     [0,   0,   0  ],
  WHITE:     [255, 255, 255],
  EMPTY:     [255, 255, 255],  // treat unset as white
  RESERVED:  [255, 255, 255],
  ERASED:    [255, 255, 255],  // erased → white (worst case for decoder)
  CORRUPTED: [0,   0,   0  ],  // corrupted → flipped to black
  RECOVERED: [0,   0,   0  ],  // recovered → treat as original black
};

/**
 * Renders a Matrix into a flat RGBA Uint8ClampedArray.
 * Adds a quiet zone of white modules on all four sides.
 *
 * jsQR expects: Uint8ClampedArray of [R, G, B, A, R, G, B, A, ...] row-major.
 */
function matrixToImageData(matrix: Matrix): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const matrixSize = matrix.length;
  const imageSize = (matrixSize + QUIET_ZONE * 2) * MODULE_PX;
  const canvas = createCanvas(imageSize, imageSize);
  const ctx = canvas.getContext("2d");

  // Fill white background (quiet zone)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, imageSize, imageSize);

  // Draw each module
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const cell = matrix[r][c];
      const [red, green, blue] = MODULE_COLOR[cell] ?? [255, 255, 255];
      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      const px = (c + QUIET_ZONE) * MODULE_PX;
      const py = (r + QUIET_ZONE) * MODULE_PX;
      ctx.fillRect(px, py, MODULE_PX, MODULE_PX);
    }
  }

  const imageData = ctx.getImageData(0, 0, imageSize, imageSize);
  return { data: imageData.data as unknown as Uint8ClampedArray, width: imageSize, height: imageSize };
}

// ─── POST /api/decode ─────────────────────────────────────────────────────────

decodeRouter.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    validateDecodeRequest(req);

    const { matrix, ecLevel = "M" } = req.body as {
      matrix: Matrix;
      version?: number;
      ecLevel?: ECLevel;
    };

    // Render matrix to pixel buffer
    const { data, width, height } = matrixToImageData(matrix);

    // Run jsQR
    const decoded = jsQR(data, width, height, {
      inversionAttempts: "dontInvert",
    });

    const success = decoded !== null;

    // Phase 1 returns a minimal trace — all zeros, no per-block data yet.
    // Phase 3 replaces this with real RS correction trace.
    const stubTrace: DecodeResult["trace"] = [];
    const stubSummary: DecodeResult["summary"] = {
      totalErrors: 0,
      totalFailures: 0,
      success,
    };

    const result: DecodeResult = {
      text: decoded?.data ?? "",
      success,
      trace: stubTrace,
      summary: stubSummary,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});