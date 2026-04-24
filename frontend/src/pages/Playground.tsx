// src/pages/Playground.tsx
import { useState } from "react";
import useQRStore from "../state/qrStore";
import { useQRGenerator } from "../hooks/useQRGenerator";
import { useDamageEngine } from "../hooks/useDamageEngine";
import MatrixViewer from "../components/MatrixViewer";
import DamageEditor from "../components/DamageEditor";
import RecoveryTraceComponent from "../components/RecoveryTrace";
import type { ECLevel } from "@qrlab/types";

// ─── step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Generate", "Damage", "Decode", "Analyze"] as const;

function PipelineSteps({ currentStep }: { currentStep: number }): React.ReactElement {
  return (
    <div style={styles.steps}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ ...styles.stepDot, background: i <= currentStep ? "#1a1a2e" : "#ddd", color: i <= currentStep ? "#fff" : "#999" }}>
            {i + 1}
          </div>
          <span style={{ fontSize: "13px", color: i <= currentStep ? "#1a1a2e" : "#aaa" }}>{label}</span>
          {i < STEPS.length - 1 && <div style={styles.stepLine} />}
        </div>
      ))}
    </div>
  );
}

// ─── input panel ──────────────────────────────────────────────────────────────

function InputPanel(): React.ReactElement {
  const [input,   setInput]   = useState("HELLO WORLD");
  const [ecLevel, setECLevel] = useState<ECLevel>("M");
  const { generate, loading, error } = useQRGenerator();

  const EC_HINTS: Record<ECLevel, string> = {
    L: "7% recovery", M: "15% recovery", Q: "25% recovery", H: "30% recovery",
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>1 — Input</h3>
      <label style={styles.label}>Text to encode</label>
      <textarea value={input} rows={3} style={styles.textarea}
        onChange={(e) => setInput(e.target.value)} />
      <label style={styles.label}>Error correction level</label>
      <div style={styles.pillRow}>
        {(["L","M","Q","H"] as ECLevel[]).map((ec) => (
          <button key={ec} onClick={() => setECLevel(ec)}
            style={{ ...styles.pill, ...(ecLevel === ec ? styles.pillActive : {}) }}>
            {ec}
          </button>
        ))}
      </div>
      <div style={styles.hint}>{EC_HINTS[ecLevel]}</div>
      {error && <div style={styles.error}>{error}</div>}
      <button onClick={() => generate(input, ecLevel)} disabled={loading || !input.trim()} style={styles.primaryBtn}>
        {loading ? "Generating…" : "Generate QR"}
      </button>
    </div>
  );
}

// ─── QR info panel ────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div style={styles.infoItem}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value ?? "—"}</span>
    </div>
  );
}

function CodewordGrid({ bytes, color }: { bytes: number[]; color: string }): React.ReactElement {
  return (
    <div style={styles.cwGrid}>
      {bytes.map((b, i) => (
        <span key={i} style={{ ...styles.cwByte, color }}>
          {b.toString(16).padStart(2, "0").toUpperCase()}
        </span>
      ))}
    </div>
  );
}

function QRInfoPanel(): React.ReactElement | null {
  const version       = useQRStore((s) => s.version);
  const mode          = useQRStore((s) => s.mode);
  const ecLevel       = useQRStore((s) => s.ecLevel);
  const blockConfig   = useQRStore((s) => s.blockConfig);
  const dataCodewords = useQRStore((s) => s.dataCodewords);
  const ecCodewords   = useQRStore((s) => s.ecCodewords);

  if (!version) return null;

  const totalBlocks = blockConfig.reduce((s, b) => s + b.count, 0);

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>QR info</h3>
      <div style={styles.infoGrid}>
        <InfoItem label="Version"    value={`V${version} (${version * 4 + 17}×${version * 4 + 17})`} />
        <InfoItem label="Mode"       value={mode} />
        <InfoItem label="EC level"   value={ecLevel} />
        <InfoItem label="Blocks"     value={totalBlocks} />
        <InfoItem label="Data bytes" value={dataCodewords.length} />
        <InfoItem label="EC bytes"   value={ecCodewords.length} />
      </div>
      {dataCodewords.length > 0 && (
        <>
          <div style={styles.cwLabel}>Data codewords</div>
          <CodewordGrid bytes={dataCodewords} color="#1a6630" />
          <div style={styles.cwLabel}>EC codewords</div>
          <CodewordGrid bytes={ecCodewords} color="#856404" />
        </>
      )}
    </div>
  );
}

// ─── decode panel ─────────────────────────────────────────────────────────────

function DecodePanel(): React.ReactElement | null {
  const matrix            = useQRStore((s) => s.matrix);
  const damagedMatrix     = useQRStore((s) => s.damagedMatrix);
  const decodedText       = useQRStore((s) => s.decodedText);
  const recoveryTrace     = useQRStore((s) => s.recoveryTrace);
  const correctionSummary = useQRStore((s) => s.correctionSummary);
  const version           = useQRStore((s) => s.version);
  const ecLevel           = useQRStore((s) => s.ecLevel);
  const { decode, loading, error } = useDamageEngine();

  const targetMatrix = damagedMatrix ?? matrix;
  if (!targetMatrix || !version) return null;

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>3 — Decode</h3>
      <button onClick={() => decode(targetMatrix, version, ecLevel)} disabled={loading} style={styles.primaryBtn}>
        {loading ? "Decoding…" : "Attempt decode"}
      </button>
      {error && <div style={styles.error}>{error}</div>}
      {decodedText !== null && (
        <div style={{ ...styles.decodeResult, borderColor: decodedText ? "#22cc66" : "#ff4444" }}>
          {decodedText
            ? <><span style={{ color: "#22cc66" }}>✓</span> {decodedText}</>
            : <span style={{ color: "#ff4444" }}>✗ Decode failed — too much damage</span>
          }
        </div>
      )}
      <RecoveryTraceComponent trace={recoveryTrace} summary={correctionSummary} />
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Playground(): React.ReactElement {
  const matrix        = useQRStore((s) => s.matrix);
  const damagedMatrix = useQRStore((s) => s.damagedMatrix);
  const decodedText   = useQRStore((s) => s.decodedText);

  const currentStep =
    decodedText   !== null ? 2 :
    damagedMatrix !== null ? 1 :
    matrix        !== null ? 0 : -1;

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>QRLab — Playground</h2>
      <PipelineSteps currentStep={currentStep} />

      <div style={styles.columns}>
        <div style={styles.leftCol}>
          <InputPanel />
          <QRInfoPanel />
          {matrix && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>2 — Damage</h3>
              <DamageEditor matrix={matrix} />
            </div>
          )}
          <DecodePanel />
        </div>
        <div style={styles.rightCol}>
          <MatrixViewer moduleSize={8} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:        { padding: "24px", maxWidth: "1200px", margin: "0 auto" },
  pageTitle:   { fontSize: "22px", fontWeight: "500", marginBottom: "16px" },
  steps:       { display: "flex", alignItems: "center", gap: "0", marginBottom: "24px", flexWrap: "wrap" },
  stepDot:     { width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "500", flexShrink: 0 },
  stepLine:    { width: "32px", height: "1px", background: "#ddd", margin: "0 4px" },
  columns:     { display: "flex", gap: "32px", alignItems: "flex-start" },
  leftCol:     { display: "flex", flexDirection: "column", gap: "16px", minWidth: "300px", maxWidth: "360px" },
  rightCol:    { flex: 1 },
  card:        { border: "1px solid #e5e5e5", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  cardTitle:   { fontSize: "14px", fontWeight: "500", margin: 0 },
  label:       { fontSize: "12px", color: "#555" },
  textarea:    { width: "100%", padding: "8px", fontSize: "13px", border: "1px solid #ddd", borderRadius: "6px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" },
  pillRow:     { display: "flex", gap: "6px" },
  pill:        { padding: "4px 12px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px", background: "transparent", fontSize: "13px" },
  pillActive:  { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" },
  hint:        { fontSize: "11px", color: "#999" },
  error:       { fontSize: "12px", color: "#ff4444" },
  primaryBtn:  { padding: "9px 18px", cursor: "pointer", border: "none", borderRadius: "6px", background: "#1a1a2e", color: "#fff", fontSize: "13px", fontWeight: "500" },
  infoGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" },
  infoItem:    { display: "flex", flexDirection: "column", gap: "2px" },
  infoLabel:   { fontSize: "11px", color: "#999" },
  infoValue:   { fontSize: "13px", fontWeight: "500", fontFamily: "monospace" },
  cwLabel:     { fontSize: "11px", color: "#999", marginTop: "4px" },
  cwGrid:      { display: "flex", flexWrap: "wrap", gap: "4px" },
  cwByte:      { fontFamily: "monospace", fontSize: "11px", padding: "2px 4px", background: "#f5f5f5", borderRadius: "3px" },
  decodeResult:{ padding: "10px", border: "1px solid", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace", wordBreak: "break-all" },
};