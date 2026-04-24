// src/components/QRCanvas.tsx
import { useRef, useEffect, useCallback } from "react";
import type { Matrix, ModuleValue } from "@qrlab/types";
import {
  renderMatrixToCanvas,
  exportCanvasAsPNG,
  type HighlightCoord,
} from "../services/matrixRenderer";

interface QRCanvasProps {
  matrix:           Matrix;
  moduleSize?:      number;
  showGrid?:        boolean;
  highlightCoords?: HighlightCoord[];
  onModuleClick?:   (row: number, col: number, value: ModuleValue) => void;
  onModuleHover?:   (row: number, col: number, value: ModuleValue) => void;
  label?:           string;
}

const QUIET_MODULE_SIZE = 2;

export default function QRCanvas({
  matrix,
  moduleSize    = 10,
  showGrid      = false,
  highlightCoords = [],
  onModuleClick,
  onModuleHover,
  label,
}: QRCanvasProps): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !matrix?.length) return;
    renderMatrixToCanvas(canvasRef.current, matrix, {
      moduleSize,
      showGrid,
      highlightCoords,
    });
  }, [matrix, moduleSize, showGrid, highlightCoords]);

  const quietOffset = QUIET_MODULE_SIZE * moduleSize;

  const coordFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { row: number; col: number } | null => {
      if (!canvasRef.current || !matrix) return null;

      const rect = canvasRef.current.getBoundingClientRect();

      const col = Math.floor((e.clientX - rect.left - quietOffset) / moduleSize);
      const row = Math.floor((e.clientY - rect.top - quietOffset) / moduleSize);

      const n = matrix.length;
      if (row < 0 || row >= n || col < 0 || col >= n) return null;

      return { row, col };
    },
    [matrix, moduleSize, quietOffset]
  );

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onModuleClick || !matrix) return;
    const coord = coordFromEvent(e);
    if (coord) onModuleClick(coord.row, coord.col, matrix[coord.row][coord.col]);
  }, [matrix, onModuleClick, coordFromEvent]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onModuleHover || !matrix) return;
    const coord = coordFromEvent(e);
    if (coord) onModuleHover(coord.row, coord.col, matrix[coord.row][coord.col]);
  }, [matrix, onModuleHover, coordFromEvent]);

  const download = useCallback(() => {
    if (canvasRef.current) exportCanvasAsPNG(canvasRef.current, label ?? "qr");
  }, [label]);

  if (!matrix?.length) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderText}>No QR generated yet</span>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{ cursor: onModuleClick ? "pointer" : "default", display: "block" }}
      />
      <div style={styles.footer}>
        {label && <span style={styles.labelText}>{label}</span>}
        <button onClick={download} style={styles.btn}>Download PNG</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:         { display: "inline-flex", flexDirection: "column", gap: "8px" },
  footer:          { display: "flex", justifyContent: "space-between", alignItems: "center" },
  labelText:       { fontSize: "12px", color: "#666", fontFamily: "monospace" },
  btn:             { fontSize: "11px", padding: "2px 8px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px", background: "transparent" },
  placeholder:     { width: "200px", height: "200px", border: "2px dashed #ccc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#999", fontSize: "13px" },
};