// src/components/MatrixViewer.tsx
import { useState, useCallback } from "react";
import type { Matrix, ModuleValue } from "@qrlab/types";
import QRCanvas from "./QRCanvas";
import useQRStore from "../state/qrStore";
import { getModuleRegionLabel, type RegionLabel } from "../services/regionLabels";
import type { HighlightCoord } from "../services/matrixRenderer";

const STATE_COLORS: Record<ModuleValue, string> = {
  BLACK: "#000000", WHITE: "#ffffff", EMPTY: "#f0f0f0", RESERVED: "#b0b0ff",
  ERASED: "#ff4444", CORRUPTED: "#ff9900", RECOVERED: "#22cc66",
};

function ModuleStateKey(): React.ReactElement {
  return (
    <div style={styles.legend}>
      {(Object.entries(STATE_COLORS) as [ModuleValue, string][]).map(([state, color]) => (
        <span key={state} style={styles.legendItem}>
          <span style={{ ...styles.legendSwatch, background: color, border: "1px solid #ccc" }} />
          {state.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

interface TooltipInfo { row: number; col: number; value: ModuleValue; }

function ModuleTooltip({ info, regionLabel }: { info: TooltipInfo | null; regionLabel: RegionLabel | null }): React.ReactElement | null {
  if (!info) return null;
  return (
    <div style={styles.tooltip}>
      <strong>({info.row}, {info.col})</strong>
      <span>{info.value}</span>
      {regionLabel && <span style={styles.regionTag}>{regionLabel}</span>}
    </div>
  );
}

interface PanelProps {
  label: string; matrix: Matrix | null;
  moduleSize: number; hoveredCoord: TooltipInfo | null;
  onHover: (info: TooltipInfo) => void;
}

function Panel({ label, matrix, moduleSize, hoveredCoord, onHover }: PanelProps): React.ReactElement {
  const highlights: HighlightCoord[] = hoveredCoord
    ? [{ row: hoveredCoord.row, col: hoveredCoord.col, color: "#4a90d9", alpha: 0.5 }]
    : [];

  if (!matrix) {
    return (
      <div style={styles.emptyPanel}>
        <span style={styles.emptyLabel}>{label}</span>
        <span style={styles.emptyHint}>Not available yet</span>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>{label}</div>
      <QRCanvas matrix={matrix} moduleSize={moduleSize} highlightCoords={highlights}
        onModuleHover={(row, col, value) => onHover({ row, col, value })} label={label} />
    </div>
  );
}

interface MatrixViewerProps { moduleSize?: number; }

export default function MatrixViewer({ moduleSize = 8 }: MatrixViewerProps): React.ReactElement {
  const matrix        = useQRStore((s) => s.matrix);
  const damagedMatrix = useQRStore((s) => s.damagedMatrix);
  const version       = useQRStore((s) => s.version);
  const [hovered, setHovered] = useState<TooltipInfo | null>(null);
  const handleHover = useCallback((info: TooltipInfo) => setHovered(info), []);

  const regionLabel: RegionLabel | null =
    hovered && version ? getModuleRegionLabel(hovered.row, hovered.col, version) : null;

  const panels = [
    { label: "Original",  matrix },
    { label: "Damaged",   matrix: damagedMatrix },
    { label: "Recovered", matrix },
  ];

  return (
    <div style={styles.wrapper}>
      <div style={styles.panels}>
        {panels.map(({ label, matrix: m }) => (
          <Panel key={label} label={label} matrix={m} moduleSize={moduleSize}
            hoveredCoord={hovered} onHover={handleHover} />
        ))}
      </div>
      <ModuleTooltip info={hovered} regionLabel={regionLabel} />
      <ModuleStateKey />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:     { display: "flex", flexDirection: "column", gap: "12px" },
  panels:      { display: "flex", gap: "24px", flexWrap: "wrap" },
  panel:       { display: "flex", flexDirection: "column", gap: "6px" },
  panelHeader: { fontSize: "13px", fontWeight: "500", color: "#333" },
  emptyPanel:  { width: "160px", height: "160px", border: "2px dashed #ddd", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" },
  emptyLabel:  { fontSize: "13px", fontWeight: "500", color: "#aaa" },
  emptyHint:   { fontSize: "11px", color: "#ccc" },
  tooltip:     { display: "inline-flex", gap: "8px", alignItems: "center", padding: "4px 10px", background: "#1a1a2e", color: "#fff", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace" },
  regionTag:   { background: "rgba(255,255,255,0.15)", padding: "1px 6px", borderRadius: "4px", fontSize: "11px" },
  legend:      { display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px", color: "#555" },
  legendItem:  { display: "flex", alignItems: "center", gap: "4px" },
  legendSwatch:{ width: "12px", height: "12px", borderRadius: "2px", display: "inline-block" },
};