// src/pages/Analysis.tsx
// Phase 5 — per-module criticality heatmap and region analysis.

import { useState, useCallback } from "react";
import useSimulationStore from "../state/simulationStore";
import useQRStore from "../state/qrStore";
import { useSimulation } from "../hooks/useSimulation";
import Heatmap, { type HeatmapTooltipInfo } from "../components/Heatmap";
import type { ECLevel } from "@qrlab/types";

// ─── region analysis table ────────────────────────────────────────────────────

interface RegionRow {
  regionLabel:    string;
  moduleCount:    number;
  avgCriticality: number;
  maxCriticality: number;
}

function CriticalityBar({ value }: { value: number }): React.ReactElement {
  const pct   = Math.round(value * 100);
  const color = value > 0.7 ? "#ff4444" : value > 0.4 ? "#ff9900" : "#22cc66";
  return (
    <div style={styles.barWrapper}>
      <div style={{ ...styles.barFill, width: `${pct}%`, background: color }} />
      <span style={styles.barLabel}>{pct}%</span>
    </div>
  );
}

function RegionAnalysisPanel({ regions }: { regions: RegionRow[] }): React.ReactElement {
  if (!regions.length) {
    return <div style={styles.empty}>Run a heatmap scan to see region analysis.</div>;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Region</th>
            <th style={styles.th}>Modules</th>
            <th style={styles.th}>Avg criticality</th>
            <th style={styles.th}>Max</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (
            <tr key={r.regionLabel}>
              <td style={styles.td}>
                <span style={styles.regionLabel}>{r.regionLabel}</span>
              </td>
              <td style={styles.td}>{r.moduleCount}</td>
              <td style={{ ...styles.td, minWidth: "160px" }}>
                <CriticalityBar value={r.avgCriticality} />
              </td>
              <td style={styles.td}>{Math.round(r.maxCriticality * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── heatmap config ───────────────────────────────────────────────────────────

interface HeatmapConfigProps {
  onRun:    (version: number, ecLevel: ECLevel) => void;
  disabled: boolean;
}

function HeatmapConfigPanel({ onRun, disabled }: HeatmapConfigProps): React.ReactElement {
  const [version,  setVersion]  = useState(1);
  const [ecLevel,  setECLevel]  = useState<ECLevel>("M");

  const n         = version * 4 + 17;
  const probes    = n * n;
  const estSecs   = Math.round(probes / 50); // rough: ~50 decodes/sec

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Heatmap configuration</h3>

      <div style={styles.configRow}>
        <label style={styles.fieldLabel}>QR version (1–10)</label>
        <input type="number" min={1} max={10} value={version} style={styles.numInput}
          onChange={(e) => setVersion(Math.min(10, Math.max(1, Number(e.target.value))))} />
      </div>

      <div style={styles.configRow}>
        <label style={styles.fieldLabel}>EC level</label>
        <div style={styles.pillRow}>
          {(["L","M","Q","H"] as ECLevel[]).map((ec) => (
            <button key={ec} onClick={() => setECLevel(ec)}
              style={{ ...styles.pill, ...(ecLevel === ec ? styles.pillActive : {}) }}>
              {ec}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.probeInfo}>
        {probes.toLocaleString()} module probes
        {" · "}est. {estSecs < 60 ? `${estSecs}s` : `${Math.round(estSecs / 60)}m`}
      </div>

      <button onClick={() => onRun(version, ecLevel)} disabled={disabled} style={styles.primaryBtn}>
        {disabled ? "Scanning…" : "Run heatmap scan"}
      </button>
    </div>
  );
}

// ─── tooltip display ──────────────────────────────────────────────────────────

function HoverInfo({ info }: { info: HeatmapTooltipInfo | null }): React.ReactElement | null {
  if (!info) return null;
  return (
    <div style={styles.hoverInfo}>
      <span>({info.row}, {info.col})</span>
      <span style={styles.hoverRegion}>{info.regionLabel}</span>
      <span>criticality: <strong>{Math.round(info.score * 100)}%</strong></span>
    </div>
  );
}

// ─── export ───────────────────────────────────────────────────────────────────

function ExportPanel({ regions, heatmap }: { regions: RegionRow[]; heatmap: number[][] | null }): React.ReactElement | null {
  if (!regions.length) return null;

  const exportRegionsCSV = (): void => {
    const header = "region,moduleCount,avgCriticality,maxCriticality";
    const rows   = regions.map((r) =>
      `${r.regionLabel},${r.moduleCount},${r.avgCriticality},${r.maxCriticality}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = "region-analysis.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportHeatmapCSV = (): void => {
    if (!heatmap) return;
    const header = "row,col,criticality";
    const rows: string[] = [];
    heatmap.forEach((row, r) =>
      row.forEach((v, c) => rows.push(`${r},${c},${v}`))
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = "heatmap-data.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportJSON = (): void => {
    const blob = new Blob(
      [JSON.stringify({ regions, heatmap }, null, 2)],
      { type: "application/json" }
    );
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = "analysis-report.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div style={styles.exportRow}>
      <span style={styles.exportLabel}>Export:</span>
      <button onClick={exportRegionsCSV} style={styles.exportBtn}>Regions CSV</button>
      <button onClick={exportHeatmapCSV} style={styles.exportBtn}>Heatmap CSV</button>
      <button onClick={exportJSON}       style={styles.exportBtn}>Full JSON</button>
    </div>
  );
}

// ─── progress bar ─────────────────────────────────────────────────────────────

function ScanProgress({ progress, status }: { progress: number; status: string }): React.ReactElement | null {
  if (status !== "running") return null;
  return (
    <div style={styles.progressWrapper}>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
      <span style={styles.progressLabel}>{progress}% scanned</span>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Analysis(): React.ReactElement {
  const matrix        = useQRStore((s) => s.matrix);
  const version       = useQRStore((s) => s.version);
  const { status, progress, heatmap, regionAnalysis } = useSimulationStore();
  const { runHeatmap, cancel } = useSimulation();
  const [tooltip, setTooltip]  = useState<HeatmapTooltipInfo | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const isRunning = status === "running";

  const handleRun = useCallback(async (v: number, ec: ECLevel): Promise<void> => {
    setScanError(null);
    try {
      await runHeatmap(v, ec);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Heatmap scan failed");
    }
  }, [runHeatmap]);

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>Analysis</h2>
      <p style={styles.subtitle}>
        Per-module criticality heatmap — which modules matter most for decode success?
      </p>

      <div style={styles.layout}>
        {/* Left column — config + region table */}
        <div style={styles.leftCol}>
          <HeatmapConfigPanel onRun={handleRun} disabled={isRunning} />

          {isRunning && (
            <button onClick={cancel} style={styles.cancelBtn}>Cancel scan</button>
          )}
          {scanError && <div style={styles.error}>{scanError}</div>}

          <ScanProgress progress={progress} status={status} />

          {regionAnalysis.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Region analysis</h3>
              <RegionAnalysisPanel regions={regionAnalysis as RegionRow[]} />
            </div>
          )}

          <ExportPanel regions={regionAnalysis as RegionRow[]} heatmap={heatmap} />
        </div>

        {/* Right column — heatmap + tooltip */}
        <div style={styles.rightCol}>
          <HoverInfo info={tooltip} />
          <Heatmap
            matrix={matrix}
            heatmapData={heatmap}
            version={version}
            moduleSize={10}
            opacity={0.65}
            onHover={setTooltip}
          />

          {/* Insight panel after scan completes */}
          {status === "done" && regionAnalysis.length > 0 && (
            <div style={styles.insightBox}>
              <strong>Key finding:</strong>{" "}
              {(() => {
                const top = (regionAnalysis as RegionRow[])[0];
                return `The most critical region is "${top.regionLabel}" 
                  with an average criticality of ${Math.round(top.avgCriticality * 100)}%. 
                  Damage here is most likely to cause decode failure regardless of EC level.`;
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:           { padding: "24px", maxWidth: "1100px", margin: "0 auto" },
  pageTitle:      { fontSize: "22px", fontWeight: "500", marginBottom: "4px" },
  subtitle:       { fontSize: "13px", color: "#888", marginBottom: "24px" },
  layout:         { display: "flex", gap: "32px", alignItems: "flex-start" },
  leftCol:        { display: "flex", flexDirection: "column", gap: "16px", minWidth: "280px", maxWidth: "340px" },
  rightCol:       { flex: 1, display: "flex", flexDirection: "column", gap: "12px" },
  card:           { border: "1px solid #e5e5e5", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" },
  cardTitle:      { fontSize: "14px", fontWeight: "500", margin: 0 },
  configRow:      { display: "flex", flexDirection: "column", gap: "4px" },
  fieldLabel:     { fontSize: "12px", color: "#555" },
  numInput:       { width: "80px", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "13px" },
  pillRow:        { display: "flex", gap: "6px" },
  pill:           { padding: "3px 10px", border: "1px solid #ccc", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "13px" },
  pillActive:     { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" },
  probeInfo:      { fontSize: "11px", color: "#999", padding: "6px 10px", background: "#f8f8f8", borderRadius: "6px" },
  primaryBtn:     { padding: "9px 18px", cursor: "pointer", border: "none", borderRadius: "6px", background: "#1a1a2e", color: "#fff", fontSize: "13px", fontWeight: "500" },
  cancelBtn:      { padding: "7px 14px", cursor: "pointer", border: "1px solid #ddd", borderRadius: "6px", background: "transparent", fontSize: "12px", color: "#666" },
  progressWrapper:{ display: "flex", alignItems: "center", gap: "10px" },
  progressBar:    { flex: 1, height: "6px", background: "#eee", borderRadius: "3px", overflow: "hidden" },
  progressFill:   { height: "100%", background: "#4a90d9", borderRadius: "3px", transition: "width 0.3s ease" },
  progressLabel:  { fontSize: "12px", color: "#666", whiteSpace: "nowrap" },
  error:          { fontSize: "12px", color: "#ff4444" },
  tableWrapper:   { overflowX: "auto" },
  table:          { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th:             { textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee", color: "#666", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" },
  td:             { padding: "8px 10px", borderBottom: "1px solid #f0f0f0", fontFamily: "monospace" },
  regionLabel:    { padding: "2px 8px", borderRadius: "4px", background: "#f0f0f0", fontSize: "12px" },
  barWrapper:     { display: "flex", alignItems: "center", gap: "8px" },
  barFill:        { height: "6px", borderRadius: "3px", transition: "width 0.3s" },
  barLabel:       { fontSize: "11px", color: "#666", minWidth: "30px" },
  exportRow:      { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  exportLabel:    { fontSize: "12px", color: "#888" },
  exportBtn:      { padding: "4px 10px", fontSize: "12px", cursor: "pointer", border: "1px solid #ddd", borderRadius: "4px", background: "transparent" },
  hoverInfo:      { display: "inline-flex", gap: "10px", alignItems: "center", padding: "6px 12px", background: "#1a1a2e", color: "#fff", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace" },
  hoverRegion:    { background: "rgba(255,255,255,0.15)", padding: "1px 6px", borderRadius: "4px" },
  insightBox:     { padding: "12px 16px", background: "#f0f7ff", border: "1px solid #c8e0f5", borderRadius: "8px", fontSize: "13px", lineHeight: "1.6" },
  empty:          { fontSize: "13px", color: "#aaa", padding: "8px 0" },
};