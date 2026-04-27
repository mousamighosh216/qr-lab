// src/components/Heatmap.tsx
import { useRef, useEffect, useCallback } from "react";
import type { Matrix } from "@qrlab/types";
import { renderMatrixToCanvas, renderHeatmapOverlay, exportCanvasAsPNG } from "../services/matrixRenderer";
import { getModuleRegionLabel, type RegionLabel } from "../services/regionLabels";

// ─── types ────────────────────────────────────────────────────────────────────

export interface HeatmapTooltipInfo {
  row:         number;
  col:         number;
  score:       number;
  regionLabel: RegionLabel;
}

interface HeatmapProps {
  matrix:      Matrix | null;
  heatmapData: number[][] | null;
  version:     number | null;
  moduleSize?: number;
  opacity?:    number;
  onHover?:    (info: HeatmapTooltipInfo | null) => void;
}

// ─── legend ───────────────────────────────────────────────────────────────────

function HeatmapLegend(): React.ReactElement {
  const stops = [
    { label: "Low",    color: "rgb(0,200,0)"   },
    { label: "Medium", color: "rgb(255,165,0)" },
    { label: "High",   color: "rgb(255,0,0)"   },
  ];
  return (
    <div style={styles.legendWrapper}>
      <span style={styles.legendTitle}>Criticality</span>
      <div style={styles.legendBar} />
      <div style={styles.legendLabels}>
        {stops.map((s) => (
          <span key={s.label} style={styles.legendLabel}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Heatmap({
  matrix,
  heatmapData,
  version,
  moduleSize = 8,
  opacity    = 0.65,
  onHover,
}: HeatmapProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !matrix?.length) return;

    if (heatmapData?.length) {
      renderHeatmapOverlay(canvasRef.current, matrix, heatmapData, { moduleSize, opacity });
    } else {
      renderMatrixToCanvas(canvasRef.current, matrix, { moduleSize, showQuietZone: false });
    }
  }, [matrix, heatmapData, moduleSize, opacity]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !matrix || !version) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const col  = Math.floor((e.clientX - rect.left)  / moduleSize);
      const row  = Math.floor((e.clientY - rect.top)   / moduleSize);
      const n    = matrix.length;
      if (row < 0 || row >= n || col < 0 || col >= n) { onHover?.(null); return; }
      const score       = heatmapData?.[row]?.[col] ?? 0;
      const regionLabel = getModuleRegionLabel(row, col, version);
      onHover?.({ row, col, score, regionLabel });
    },
    [matrix, heatmapData, version, moduleSize, onHover]
  );

  const handleMouseLeave = useCallback(() => onHover?.(null), [onHover]);

  const download = useCallback(() => {
    if (canvasRef.current) exportCanvasAsPNG(canvasRef.current, "qrlab-heatmap");
  }, []);

  if (!matrix?.length) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderText}>
          {heatmapData ? "Loading heatmap…" : "Generate a QR code first"}
        </span>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: "block", cursor: "crosshair" }}
      />
      <div style={styles.footer}>
        <HeatmapLegend />
        <button onClick={download} style={styles.btn}>Download PNG</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:         { display: "inline-flex", flexDirection: "column", gap: "10px" },
  footer:          { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  placeholder:     { width: "240px", height: "240px", border: "2px dashed #ccc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#999", fontSize: "13px" },
  legendWrapper:   { display: "flex", flexDirection: "column", gap: "3px" },
  legendTitle:     { fontSize: "11px", color: "#666" },
  legendBar:       { width: "120px", height: "8px", borderRadius: "4px", background: "linear-gradient(to right, rgb(0,200,0), rgb(255,165,0), rgb(255,0,0))" },
  legendLabels:    { display: "flex", justifyContent: "space-between", width: "120px" },
  legendLabel:     { fontSize: "10px", color: "#888" },
  btn:             { fontSize: "11px", padding: "3px 10px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px", background: "transparent" },
};