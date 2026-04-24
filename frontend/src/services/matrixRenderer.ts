// src/services/matrixRenderer.ts
import type { Matrix, ModuleValue } from "@qrlab/types";

export interface RenderOptions {
  moduleSize?:       number;
  showQuietZone?:    boolean;
  showGrid?:         boolean;
  highlightCoords?:  HighlightCoord[];
}

export interface HighlightCoord {
  row:    number;
  col:    number;
  color:  string;
  alpha?: number;
}

export interface DiffRenderOptions {
  moduleSize?: number;
  diffColor?:  string;
  gap?:        number;
}

export interface HeatmapRenderOptions {
  moduleSize?: number;
  opacity?:    number;
}

const MODULE_COLORS: Record<ModuleValue, string> = {
  BLACK:     "#000000",
  WHITE:     "#ffffff",
  EMPTY:     "#f0f0f0",
  RESERVED:  "#b0b0ff",
  ERASED:    "#ff4444",
  CORRUPTED: "#ff9900",
  RECOVERED: "#22cc66",
};

const QUIET_ZONE = 2;

export function renderMatrixToCanvas(
  canvas:  HTMLCanvasElement,
  matrix:  Matrix,
  options: RenderOptions = {}
): void {
  const {
    moduleSize    = 10,
    showQuietZone = true,
    showGrid      = false,
    highlightCoords = [],
  } = options;

  const n          = matrix.length;
  const offset     = showQuietZone ? QUIET_ZONE * moduleSize : 0;
  const canvasSize = n * moduleSize + offset * 2;

  canvas.width  = canvasSize;
  canvas.height = canvasSize;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      ctx.fillStyle = MODULE_COLORS[matrix[r][c]] ?? "#cccccc";
      const px = offset + c * moduleSize;
      const py = offset + r * moduleSize;
      ctx.fillRect(px, py, moduleSize, moduleSize);

      if (showGrid && moduleSize >= 4) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(px, py, moduleSize, moduleSize);
      }
    }
  }

  for (const { row, col, color, alpha = 0.4 } of highlightCoords) {
    ctx.fillStyle   = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(offset + col * moduleSize, offset + row * moduleSize, moduleSize, moduleSize);
    ctx.globalAlpha = 1;
  }
}

export function renderDiffToCanvas(
  canvas:   HTMLCanvasElement,
  original: Matrix,
  modified: Matrix,
  options:  DiffRenderOptions = {}
): void {
  const { moduleSize = 8, diffColor = "#ff4444", gap = 16 } = options;
  const n        = original.length;
  const matrixPx = n * moduleSize;

  canvas.width  = matrixPx * 2 + gap;
  canvas.height = matrixPx;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      ctx.fillStyle = MODULE_COLORS[original[r][c]] ?? "#cccccc";
      ctx.fillRect(c * moduleSize, r * moduleSize, moduleSize, moduleSize);
    }
  }

  const ox = matrixPx + gap;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      ctx.fillStyle = original[r][c] !== modified[r][c]
        ? diffColor
        : (MODULE_COLORS[modified[r][c]] ?? "#cccccc");
      ctx.fillRect(ox + c * moduleSize, r * moduleSize, moduleSize, moduleSize);
    }
  }
}

export function renderHeatmapOverlay(
  canvas:      HTMLCanvasElement,
  matrix:      Matrix,
  heatmapData: number[][],
  options:     HeatmapRenderOptions = {}
): void {
  const { moduleSize = 10, opacity = 0.6 } = options;
  renderMatrixToCanvas(canvas, matrix, { moduleSize, showQuietZone: false });

  const ctx = canvas.getContext("2d")!;
  const n   = matrix.length;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const score = heatmapData?.[r]?.[c] ?? 0;
      if (score < 0.01) continue;
      const red   = Math.round(Math.min(255, score * 2 * 255));
      const green = Math.round(Math.min(255, (1 - score) * 2 * 255));
      ctx.fillStyle   = `rgb(${red},${green},0)`;
      ctx.globalAlpha = opacity * score;
      ctx.fillRect(c * moduleSize, r * moduleSize, moduleSize, moduleSize);
    }
  }
  ctx.globalAlpha = 1;
}

export function exportCanvasAsPNG(canvas: HTMLCanvasElement, filename = "qrlab-export"): void {
  const link      = document.createElement("a");
  link.download   = `${filename}.png`;
  link.href       = canvas.toDataURL("image/png");
  link.click();
}