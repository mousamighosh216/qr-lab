// src/pages/Simulation.tsx
import { useState } from "react";
import useSimulationStore from "../state/simulationStore";
import { useSimulation } from "../hooks/useSimulation";
import SimulationChart from "../components/SimulationChart";
import type { ExperimentConfig, ECLevel, DamageType } from "@qrlab/types";

// ─── config form ──────────────────────────────────────────────────────────────

const EC_LEVELS: ECLevel[]     = ["L", "M", "Q", "H"];
const DAMAGE_TYPES: { value: DamageType; label: string }[] = [
  { value: "randomNoise", label: "Random noise"    },
  { value: "blockErase",  label: "Block erase"     },
  { value: "burst",       label: "Burst / scratch" },
];

function FormField({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={styles.formField}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

interface ConfigFormProps {
  onRun:    (cfg: ExperimentConfig) => void;
  disabled: boolean;
}

function ExperimentConfigForm({ onRun, disabled }: ConfigFormProps): React.ReactElement {
  const { experimentConfig, setConfig } = useSimulationStore();
  const [formError, setFormError] = useState<string | null>(null);

  const totalTrials = experimentConfig.steps * experimentConfig.trialsPerStep;
  const isLarge     = totalTrials > 500;

  const handleRun = (): void => {
    setFormError(null);
    if (experimentConfig.minPercent >= experimentConfig.maxPercent) {
      setFormError("Max percent must be greater than min percent.");
      return;
    }
    onRun(experimentConfig);
  };

  return (
    <div style={styles.configCard}>
      <h3 style={styles.cardTitle}>Experiment configuration</h3>

      <div style={styles.formGrid}>
        <FormField label="QR version">
          <input type="number" min={1} max={10} style={styles.numInput}
            value={experimentConfig.version}
            onChange={(e) => setConfig({ version: Number(e.target.value) })} />
        </FormField>

        <FormField label="EC level">
          <div style={styles.pillRow}>
            {EC_LEVELS.map((ec) => (
              <button key={ec} onClick={() => setConfig({ ecLevel: ec })}
                style={{ ...styles.pill, ...(experimentConfig.ecLevel === ec ? styles.pillActive : {}) }}>
                {ec}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Damage type">
          <select style={styles.select} value={experimentConfig.damageType}
            onChange={(e) => setConfig({ damageType: e.target.value as DamageType })}>
            {DAMAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label={`Min damage: ${experimentConfig.minPercent}%`}>
          <input type="range" min={0} max={60} style={{ flex: 1 }}
            value={experimentConfig.minPercent}
            onChange={(e) => setConfig({ minPercent: Number(e.target.value) })} />
        </FormField>

        <FormField label={`Max damage: ${experimentConfig.maxPercent}%`}>
          <input type="range" min={1} max={80} style={{ flex: 1 }}
            value={experimentConfig.maxPercent}
            onChange={(e) => setConfig({ maxPercent: Number(e.target.value) })} />
        </FormField>

        <FormField label={`Steps: ${experimentConfig.steps}`}>
          <input type="range" min={2} max={40} style={{ flex: 1 }}
            value={experimentConfig.steps}
            onChange={(e) => setConfig({ steps: Number(e.target.value) })} />
        </FormField>

        <FormField label={`Trials / step: ${experimentConfig.trialsPerStep}`}>
          <input type="range" min={5} max={100} step={5} style={{ flex: 1 }}
            value={experimentConfig.trialsPerStep}
            onChange={(e) => setConfig({ trialsPerStep: Number(e.target.value) })} />
        </FormField>
      </div>

      <div style={{ ...styles.trialCount, color: isLarge ? "#856404" : "#1a6630" }}>
        {totalTrials} total trials
        {isLarge ? " — will be queued" : " — runs inline"}
      </div>

      {formError && <div style={styles.error}>{formError}</div>}

      <button onClick={handleRun} disabled={disabled} style={styles.primaryBtn}>
        {disabled ? "Running…" : "Run experiment"}
      </button>
    </div>
  );
}

// ─── progress bar ─────────────────────────────────────────────────────────────

function JobProgress({ progress, status }: { progress: number; status: string }): React.ReactElement | null {
  if (status !== "running") return null;
  return (
    <div style={styles.progressWrapper}>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
      <span style={styles.progressLabel}>{progress}% complete</span>
    </div>
  );
}

// ─── export row ───────────────────────────────────────────────────────────────

function ExportRow(): React.ReactElement | null {
  const { dataPoints, threshold } = useSimulationStore();
  if (!dataPoints?.length) return null;

  const downloadCSV = (): void => {
    const rows = ["damagePercent,successRate,trials",
      ...dataPoints.map((d) => `${d.damagePercent},${d.successRate},${d.trials}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "experiment-results.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadJSON = (): void => {
    const blob = new Blob([JSON.stringify({ dataPoints, threshold }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "experiment-results.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div style={styles.exportRow}>
      <span style={styles.exportLabel}>Export:</span>
      <button onClick={downloadCSV}  style={styles.exportBtn}>CSV</button>
      <button onClick={downloadJSON} style={styles.exportBtn}>JSON</button>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Simulation(): React.ReactElement {
  const { status, progress, dataPoints, threshold } = useSimulationStore();
  const { runThreshold, cancel } = useSimulation();
  const [runError, setRunError] = useState<string | null>(null);

  const isRunning = status === "running";

  const handleRun = async (config: ExperimentConfig): Promise<void> => {
    setRunError(null);
    try {
      await runThreshold(config);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Experiment failed");
    }
  };

  const chartTitle = dataPoints.length
    ? `Damage vs success rate (${dataPoints[0]?.trials ?? 0} trials / step)`
    : undefined;

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>Simulation</h2>
      <p style={styles.subtitle}>
        Run batch experiments to find the damage threshold at which decode fails.
      </p>

      <div style={styles.layout}>
        <div style={styles.leftCol}>
          <ExperimentConfigForm onRun={handleRun} disabled={isRunning} />
          {isRunning && (
            <button onClick={cancel} style={styles.cancelBtn}>Cancel</button>
          )}
          {runError && <div style={styles.error}>{runError}</div>}
          {status === "failed" && (
            <div style={styles.error}>Experiment failed. Check server logs.</div>
          )}
        </div>

        <div style={styles.rightCol}>
          <JobProgress progress={progress} status={status} />
          <SimulationChart dataPoints={dataPoints} threshold={threshold ?? undefined} title={chartTitle} />
          <ExportRow />
          {status === "done" && threshold && (
            <div style={styles.insightBox}>
              <strong>Insight:</strong> Fault-tolerance threshold ≈{" "}
              <strong>{threshold.threshold}%</strong> damage
              {" "}(confidence: {(threshold.confidence * 100).toFixed(1)}%).
              Raise the EC level to observe a higher threshold.
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
  leftCol:        { display: "flex", flexDirection: "column", gap: "12px", minWidth: "280px", maxWidth: "320px" },
  rightCol:       { flex: 1, display: "flex", flexDirection: "column", gap: "16px" },
  configCard:     { border: "1px solid #e5e5e5", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" },
  cardTitle:      { fontSize: "14px", fontWeight: "500", margin: 0 },
  formGrid:       { display: "flex", flexDirection: "column", gap: "10px" },
  formField:      { display: "flex", flexDirection: "column", gap: "4px" },
  fieldLabel:     { fontSize: "12px", color: "#555" },
  numInput:       { width: "80px", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "13px" },
  select:         { padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "13px" },
  pillRow:        { display: "flex", gap: "6px" },
  pill:           { padding: "3px 10px", border: "1px solid #ccc", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "13px" },
  pillActive:     { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" },
  trialCount:     { fontSize: "12px", padding: "6px 10px", background: "#f8f8f8", borderRadius: "6px" },
  error:          { fontSize: "12px", color: "#ff4444" },
  primaryBtn:     { padding: "9px 18px", cursor: "pointer", border: "none", borderRadius: "6px", background: "#1a1a2e", color: "#fff", fontSize: "13px", fontWeight: "500" },
  cancelBtn:      { padding: "7px 14px", cursor: "pointer", border: "1px solid #ddd", borderRadius: "6px", background: "transparent", fontSize: "12px", color: "#666" },
  progressWrapper:{ display: "flex", alignItems: "center", gap: "10px" },
  progressBar:    { flex: 1, height: "6px", background: "#eee", borderRadius: "3px", overflow: "hidden" },
  progressFill:   { height: "100%", background: "#4a90d9", borderRadius: "3px", transition: "width 0.3s ease" },
  progressLabel:  { fontSize: "12px", color: "#666", whiteSpace: "nowrap" },
  exportRow:      { display: "flex", alignItems: "center", gap: "8px" },
  exportLabel:    { fontSize: "12px", color: "#888" },
  exportBtn:      { padding: "4px 12px", fontSize: "12px", cursor: "pointer", border: "1px solid #ddd", borderRadius: "4px", background: "transparent" },
  insightBox:     { padding: "12px 16px", background: "#f0f7ff", border: "1px solid #c8e0f5", borderRadius: "8px", fontSize: "13px", lineHeight: "1.6" },
};