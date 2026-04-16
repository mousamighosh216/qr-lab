// src/api/routes/generate.ts
// Phase 1: uses the `qrcode` npm library for generation.
// Phase 2: swaps library call for our custom encoding pipeline.

import { Router, Request, Response, NextFunction } from "express";
import QRCode from "qrcode";
import type { Matrix, ModuleValue, ECLevel, Mode } from "@qrlab/types";
import type { GenerateQRResult, CapacityResult } from "@qrlab/types";
import { analyzeInput } from "../../core/bitstream/builder";
import {
  selectVersion,
  getVersionCapacity,
  getECBlockConfig,
  getTotalDataCodewords,
  getTotalECCodewords,
} from "../../core/qr/version";
import { validateGenerateRequest, validateCapacityRequest, ApiError } from "../middleware/validate";

export const generateRouter = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

// Map our ECLevel type to the string qrcode library expects
const EC_MAP: Record<ECLevel, "low" | "medium" | "quartile" | "high"> = {
  L: "low",
  M: "medium",
  Q: "quartile",
  H: "high",
};

/**
 * Converts the qrcode library's internal module matrix (boolean[][])
 * into our Matrix type (ModuleValue[][]).
 *
 * The library returns a QRCode object. We access its `modules.data` array
 * (flat Uint8Array of 0/1 values) and reshape it into our 2D grid.
 */
function libraryMatrixToMatrix(qr: any): Matrix {
  const size: number = qr.modules.size;
  const data: Uint8Array = qr.modules.data;
  const matrix: Matrix = [];

  for (let r = 0; r < size; r++) {
    const row: ModuleValue[] = [];
    for (let c = 0; c < size; c++) {
      row.push(data[r * size + c] ? "BLACK" : "WHITE");
    }
    matrix.push(row);
  }
  return matrix;
}

// ─── POST /api/generate ───────────────────────────────────────────────────────

generateRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateGenerateRequest(req);

    const { input, ecLevel, version: versionOverride } = req.body as {
      input: string;
      ecLevel: ECLevel;
      version?: number;
    };

    // Detect mode and select version
    const analysis = analyzeInput(input);
    const version = versionOverride ?? selectVersion(analysis.mode, ecLevel, analysis.characterCount);

    // Verify the chosen version actually fits the input
    const capacity = getVersionCapacity(version, ecLevel, analysis.mode);
    if (analysis.characterCount > capacity) {
      throw new ApiError(
        422,
        `Input of ${analysis.characterCount} ${analysis.mode} characters exceeds ` +
        `V${version}-${ecLevel} capacity of ${capacity}`
      );
    }

    // Generate using library — returns a QRCode object with .modules
    const qr = await QRCode.create(input, {
      errorCorrectionLevel: EC_MAP[ecLevel],
      version,
    });

    const matrix = libraryMatrixToMatrix(qr);
    const blockConfig = getECBlockConfig(version, ecLevel);
    const totalData = getTotalDataCodewords(version, ecLevel);
    const totalEC = getTotalECCodewords(version, ecLevel);

    // The library doesn't expose codewords directly — Phase 2 will fill these
    // from our custom encoder. For now return empty arrays so the shape is stable.
    const result: GenerateQRResult = {
      matrix,
      version,
      ecLevel,
      mode: analysis.mode,
      bitstream: [],          // Phase 2
      dataCodewords: [],      // Phase 2
      ecCodewords: [],        // Phase 2
      blockConfig,
      svgPreview: await QRCode.toString(input, {
        type: "svg",
        errorCorrectionLevel: EC_MAP[ecLevel],
        version,
      }),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/generate/capacity ───────────────────────────────────────────────

generateRouter.get("/capacity", (req: Request, res: Response, next: NextFunction) => {
  try {
    validateCapacityRequest(req);

    const version = Number(req.query.version);
    const ecLevel = req.query.ecLevel as ECLevel;
    const mode = req.query.mode as Mode;

    const result: CapacityResult = {
      capacity: getVersionCapacity(version, ecLevel, mode),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});