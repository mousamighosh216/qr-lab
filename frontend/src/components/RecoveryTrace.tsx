// src/components/RecoveryTrace.tsx
import { useState } from "react";
import type { RecoveryTrace, CorrectionSummary } from "@qrlab/types";

type BlockStatus = "success" | "partial" | "failed";

const STATUS_STYLE: Record<BlockStatus, React.CSSProperties> = {
  success: { background: "#d4edda", color: "#1a6630", border: "1px solid #b7dfbe" },
  partial: { background: "#fff3cd", color: "#856404", border: "1px solid #ffd966" },
  failed:  { background: "#f8d7da", color: "#842029", border: "1px solid #f5c2c7" },
};

function BlockStatusBadge({ status }: { status: BlockStatus }): React.ReactElement {
  return <span style={{ ...styles.badge, ...STATUS_STYLE[status] }}>{status}</span>;
}

interface TraceBlock {
  blockIndex:       number;
  errorsDetected:   number;
  errorsCorrected:  number;
  status:           BlockStatus;
  errorPositions?:  number[];
  errorMagnitudes?: number[];
}

function TraceRow({
  block, expanded, onToggle,
}: {
  block: TraceBlock;
  expanded: boolean;
  onToggle: (idx: number) => void;
}): React.ReactElement {
  const hasDetail = (block.errorPositions?.length ?? 0) > 0;
  return (
    <>
      <tr
        style={{ ...styles.tr, cursor: hasDetail ? "pointer" : "default" }}
        onClick={() => hasDetail && onToggle(block.blockIndex)}
      >
        <td style={styles.td}>{block.blockIndex}</td>
        <td style={styles.td}>{block.errorsDetected}</td>
        <td style={styles.td}>{block.errorsCorrected}</td>
        <td style={styles.td}><BlockStatusBadge status={block.status} /></td>
      </tr>
      {expanded && hasDetail && (
        <tr>
          <td colSpan={4} style={styles.expandedCell}>
            <div style={styles.expandedContent}>
              <div>
                <span style={styles.detailLabel}>Error positions: </span>
                <code>{block.errorPositions!.join(", ")}</code>
              </div>
              {(block.errorMagnitudes?.length ?? 0) > 0 && (
                <div>
                  <span style={styles.detailLabel}>Magnitudes (hex): </span>
                  <code>
                    {block.errorMagnitudes!.map((m) => `0x${m.toString(16).padStart(2, "0")}`).join(", ")}
                  </code>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SummaryChip({
  label, value, success, danger,
}: {
  label: string;
  value: string | number;
  success?: boolean;
  danger?: boolean;
}): React.ReactElement {
  const bg    = success ? "#d4edda" : danger ? "#f8d7da" : "#f0f0f0";
  const color = success ? "#1a6630" : danger ? "#842029" : "#333";
  return (
    <div style={{ ...styles.chip, background: bg, color }}>
      <span style={styles.chipLabel}>{label}</span>
      <span style={styles.chipValue}>{value}</span>
    </div>
  );
}

interface RecoveryTraceProps {
  trace:    RecoveryTrace;
  summary?: CorrectionSummary | null;
}

export default function RecoveryTraceComponent({ trace, summary }: RecoveryTraceProps): React.ReactElement {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (idx: number): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  if (!trace?.length) {
    return <div style={styles.empty}>Recovery trace will appear after decode.</div>;
  }

  return (
    <div style={styles.wrapper}>
      {summary && (
        <div style={styles.summaryRow}>
          <SummaryChip label="Total errors"   value={summary.totalErrors} />
          <SummaryChip label="Block failures" value={summary.totalFailures} danger={summary.totalFailures > 0} />
          <SummaryChip
            label="Result"
            value={summary.success ? "✓ Recovered" : "✗ Failed"}
            success={summary.success}
            danger={!summary.success}
          />
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Block</th>
            <th style={styles.th}>Detected</th>
            <th style={styles.th}>Corrected</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {(trace as TraceBlock[]).map((block) => (
            <TraceRow
              key={block.blockIndex}
              block={block}
              expanded={expanded.has(block.blockIndex)}
              onToggle={toggle}
            />
          ))}
        </tbody>
      </table>
      <div style={styles.hint}>Click a row with errors to see byte positions.</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:        { display: "flex", flexDirection: "column", gap: "10px" },
  empty:          { fontSize: "13px", color: "#aaa", padding: "12px 0" },
  summaryRow:     { display: "flex", gap: "8px", flexWrap: "wrap" },
  chip:           { padding: "6px 12px", borderRadius: "6px", display: "flex", flexDirection: "column", minWidth: "90px" },
  chipLabel:      { fontSize: "10px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.5px" },
  chipValue:      { fontSize: "14px", fontWeight: "500", fontFamily: "monospace" },
  table:          { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th:             { textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee", color: "#666", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" },
  td:             { padding: "8px 10px", borderBottom: "1px solid #f0f0f0", fontFamily: "monospace" },
  tr:             {},
  badge:          { padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "500" },
  expandedCell:   { padding: "0 10px 8px 10px", background: "#fafafa" },
  expandedContent:{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px", fontSize: "12px", fontFamily: "monospace", background: "#f5f5f5", borderRadius: "4px" },
  detailLabel:    { color: "#666", fontFamily: "sans-serif" },
  hint:           { fontSize: "11px", color: "#bbb" },
};