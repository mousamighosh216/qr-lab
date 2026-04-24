// src/components/DamageEditor.tsx
import { useState, useCallback } from "react";
import type { Matrix, DamageConfig, DamageType, ECLevel } from "@qrlab/types";
import type { DamageResult } from "@qrlab/types";
import { useDamageEngine } from "../hooks/useDamageEngine";
import useQRStore from "../state/qrStore";

interface RandomNoiseOpts { percentage: number; seed: number; }
interface BlockEraseOpts  { blockSizePercent: number; count: number; seed: number; }
interface BurstOpts       { angle: number; length: number; width: number; startRow: number; startCol: number; }
interface LogoEmbedOpts   { width: number; height: number; centerRow?: number; centerCol?: number; }
type AnyOpts = RandomNoiseOpts | BlockEraseOpts | BurstOpts | LogoEmbedOpts;

const DEFAULTS: Record<DamageType, AnyOpts> = {
  randomNoise: { percentage: 10, seed: 42 },
  blockErase:  { blockSizePercent: 15, count: 1, seed: 42 },
  burst:       { angle: 45, length: 20, width: 2, startRow: 10, startCol: 5 },
  logoEmbed:   { width: 7, height: 7 },
};

const DAMAGE_TYPES: { value: DamageType; label: string }[] = [
  { value: "randomNoise", label: "Random noise" },
  { value: "blockErase",  label: "Block erase"  },
  { value: "burst",       label: "Burst / scratch" },
  { value: "logoEmbed",   label: "Logo embed"   },
];

function ControlRow({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      {children}
    </div>
  );
}

function RandomNoiseControls({ opts, onChange }: { opts: RandomNoiseOpts; onChange: (o: RandomNoiseOpts) => void }): React.ReactElement {
  return (
    <>
      <ControlRow label={`Noise: ${opts.percentage}%`}>
        <input type="range" min={0} max={60} value={opts.percentage} style={{ flex: 1 }}
          onChange={(e) => onChange({ ...opts, percentage: Number(e.target.value) })} />
      </ControlRow>
      <ControlRow label="Seed">
        <input type="number" value={opts.seed} style={styles.numInput}
          onChange={(e) => onChange({ ...opts, seed: Number(e.target.value) })} />
      </ControlRow>
    </>
  );
}

function BlockEraseControls({ opts, onChange }: { opts: BlockEraseOpts; onChange: (o: BlockEraseOpts) => void }): React.ReactElement {
  return (
    <>
      <ControlRow label={`Block: ${opts.blockSizePercent}%`}>
        <input type="range" min={1} max={40} value={opts.blockSizePercent} style={{ flex: 1 }}
          onChange={(e) => onChange({ ...opts, blockSizePercent: Number(e.target.value) })} />
      </ControlRow>
      <ControlRow label="Count">
        <input type="number" min={1} max={10} value={opts.count} style={styles.numInput}
          onChange={(e) => onChange({ ...opts, count: Number(e.target.value) })} />
      </ControlRow>
    </>
  );
}

function BurstControls({ opts, onChange }: { opts: BurstOpts; onChange: (o: BurstOpts) => void }): React.ReactElement {
  return (
    <>
      <ControlRow label={`Angle: ${opts.angle}°`}>
        <input type="range" min={0} max={180} value={opts.angle} style={{ flex: 1 }}
          onChange={(e) => onChange({ ...opts, angle: Number(e.target.value) })} />
      </ControlRow>
      <ControlRow label={`Length: ${opts.length}`}>
        <input type="range" min={1} max={60} value={opts.length} style={{ flex: 1 }}
          onChange={(e) => onChange({ ...opts, length: Number(e.target.value) })} />
      </ControlRow>
      <ControlRow label={`Width: ${opts.width}`}>
        <input type="range" min={1} max={8} value={opts.width} style={{ flex: 1 }}
          onChange={(e) => onChange({ ...opts, width: Number(e.target.value) })} />
      </ControlRow>
    </>
  );
}

function LogoEmbedControls({ opts, onChange, matrixSize }: { opts: LogoEmbedOpts; onChange: (o: LogoEmbedOpts) => void; matrixSize: number }): React.ReactElement {
  const max = Math.floor(matrixSize * 0.35);
  return (
    <>
      <ControlRow label={`Width: ${opts.width}`}>
        <input type="range" min={1} max={max} value={opts.width} style={{ flex: 1 }}
          onChange={(e) => onChange({ ...opts, width: Number(e.target.value) })} />
      </ControlRow>
      <ControlRow label={`Height: ${opts.height}`}>
        <input type="range" min={1} max={max} value={opts.height} style={{ flex: 1 }}
          onChange={(e) => onChange({ ...opts, height: Number(e.target.value) })} />
      </ControlRow>
    </>
  );
}

interface DamageEditorProps {
  matrix:            Matrix;
  onDamageApplied?:  (result: DamageResult) => void;
  onPreview?:        (result: DamageResult) => void;
}

export default function DamageEditor({ matrix, onDamageApplied, onPreview }: DamageEditorProps): React.ReactElement {
  const ecLevel = useQRStore((s) => s.ecLevel);
  const [type,    setType]    = useState<DamageType>("randomNoise");
  const [options, setOptions] = useState<AnyOpts>(DEFAULTS.randomNoise);
  const [estimate, setEstimate] = useState<DamageResult["recoverabilityEstimate"] | null>(null);
  const { apply, preview, loading, error } = useDamageEngine();
  const matrixSize = matrix?.length ?? 21;

  const handleTypeChange = (newType: DamageType): void => {
    setType(newType);
    const defaults = { ...DEFAULTS[newType] } as AnyOpts;
    if (newType === "logoEmbed") {
      (defaults as LogoEmbedOpts).centerRow = Math.floor(matrixSize / 2);
      (defaults as LogoEmbedOpts).centerCol = Math.floor(matrixSize / 2);
    }
    setOptions(defaults);
  };

  const handleOptionsChange = useCallback((newOpts: AnyOpts): void => {
    setOptions(newOpts);
    if (!matrix?.length) return;
    const config: DamageConfig = { type, options: newOpts as unknown as Record<string, unknown> };
    preview(matrix, config, ecLevel, (result) => {
      setEstimate(result.recoverabilityEstimate);
      onPreview?.(result);
    });
  }, [matrix, type, ecLevel, preview, onPreview]);

  const handleApply = async (): Promise<void> => {
    if (!matrix?.length) return;
    const config: DamageConfig = { type, options: options as unknown as Record<string, unknown> };
    const result = await apply(matrix, config, ecLevel);
    if (result) onDamageApplied?.(result);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.typeRow}>
        {DAMAGE_TYPES.map((t) => (
          <button key={t.value} onClick={() => handleTypeChange(t.value)}
            style={{ ...styles.typeBtn, ...(type === t.value ? styles.typeBtnActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.controls}>
        {type === "randomNoise" && <RandomNoiseControls opts={options as RandomNoiseOpts} onChange={handleOptionsChange as (o: RandomNoiseOpts) => void} />}
        {type === "blockErase"  && <BlockEraseControls  opts={options as BlockEraseOpts}  onChange={handleOptionsChange as (o: BlockEraseOpts)  => void} />}
        {type === "burst"       && <BurstControls        opts={options as BurstOpts}        onChange={handleOptionsChange as (o: BurstOpts)        => void} />}
        {type === "logoEmbed"   && <LogoEmbedControls    opts={options as LogoEmbedOpts}    onChange={handleOptionsChange as (o: LogoEmbedOpts)    => void} matrixSize={matrixSize} />}
      </div>

      {estimate && (
        <div style={{ ...styles.estimate, borderColor: estimate.expectedSuccess ? "#22cc66" : "#ff4444", color: estimate.expectedSuccess ? "#22cc66" : "#ff4444" }}>
          {estimate.expectedSuccess ? "✓ Likely recoverable" : "✗ May fail to decode"}
          {` (${Math.round(estimate.confidence * 100)}% confidence)`}
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <button onClick={handleApply} disabled={loading || !matrix?.length} style={styles.applyBtn}>
        {loading ? "Applying…" : "Apply damage"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:      { display: "flex", flexDirection: "column", gap: "12px", minWidth: "260px" },
  typeRow:      { display: "flex", gap: "6px", flexWrap: "wrap" },
  typeBtn:      { fontSize: "12px", padding: "4px 10px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px", background: "transparent" },
  typeBtnActive:{ background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" },
  controls:     { display: "flex", flexDirection: "column", gap: "8px" },
  row:          { display: "flex", alignItems: "center", gap: "10px" },
  rowLabel:     { fontSize: "12px", color: "#555", minWidth: "100px" },
  numInput:     { width: "80px", fontSize: "12px", padding: "2px 4px", border: "1px solid #ccc", borderRadius: "4px" },
  estimate:     { fontSize: "12px", padding: "6px 10px", border: "1px solid", borderRadius: "6px" },
  error:        { fontSize: "12px", color: "#ff4444" },
  applyBtn:     { padding: "8px 16px", cursor: "pointer", border: "none", borderRadius: "6px", background: "#1a1a2e", color: "#fff", fontSize: "13px" },
};