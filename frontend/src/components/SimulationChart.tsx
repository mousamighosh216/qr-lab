// src/components/SimulationChart.tsx
import { useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
  type TooltipProps,
} from "recharts";
import type { DataPoint, ThresholdReport } from "@qrlab/types";

interface ChartTooltipPayload {
  value:   number;
  payload: DataPoint;
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>): React.ReactElement | null {
  if (!active || !payload?.length) return null;
  const d = payload[0] as unknown as ChartTooltipPayload;
  return (
    <div style={styles.tooltip}>
      <div style={styles.ttLabel}>Damage: {label}%</div>
      <div style={styles.ttRow}>
        <span style={{ color: "#4a90d9" }}>Success rate:</span>
        <span style={styles.ttVal}>{((d.value ?? 0) * 100).toFixed(1)}%</span>
      </div>
      <div style={styles.ttRow}>
        <span>Trials:</span>
        <span style={styles.ttVal}>{(d.payload as DataPoint)?.trials}</span>
      </div>
    </div>
  );
}

function ThresholdChip({ label, value }: { label: string; value: string | number }): React.ReactElement {
  return (
    <div style={styles.chip}>
      <span style={styles.chipLabel}>{label}</span>
      <span style={styles.chipValue}>{value}</span>
    </div>
  );
}

interface SimulationChartProps {
  dataPoints: DataPoint[];
  threshold?: ThresholdReport | null;
  title?:     string;
}

export default function SimulationChart({
  dataPoints, threshold, title,
}: SimulationChartProps): React.ReactElement {
  const chartRef = useRef<HTMLDivElement>(null);

  const exportSVG = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = "simulation-chart.svg";
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  if (!dataPoints?.length) {
    return <div style={styles.empty}>Run an experiment to see the chart.</div>;
  }

  return (
    <div style={styles.wrapper}>
      {title && <div style={styles.title}>{title}</div>}

      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={dataPoints} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="damagePercent"
              tickFormatter={(v: number) => `${v}%`}
              label={{ value: "Damage %", position: "insideBottom", offset: -5, fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              domain={[0, 1]}
              label={{ value: "Success rate", angle: -90, position: "insideLeft", fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Line
              type="monotone" dataKey="successRate" name="Success rate"
              stroke="#4a90d9" strokeWidth={2}
              dot={{ r: 4, fill: "#4a90d9" }} activeDot={{ r: 6 }}
            />
            {threshold && (
              <ReferenceLine x={threshold.threshold} stroke="#ff4444" strokeDasharray="6 3"
                label={{ value: `${threshold.threshold}%`, position: "top", fill: "#ff4444", fontSize: 11 }} />
            )}
            <ReferenceLine y={0.5} stroke="#999" strokeDasharray="4 4"
              label={{ value: "50%", position: "right", fill: "#999", fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {threshold && (
        <div style={styles.chips}>
          <ThresholdChip label="Threshold"  value={`${threshold.threshold}%`} />
          <ThresholdChip label="Confidence" value={`${(threshold.confidence * 100).toFixed(1)}%`} />
          <ThresholdChip label="Trials"     value={threshold.sampleSize} />
        </div>
      )}

      <button onClick={exportSVG} style={styles.exportBtn}>Export SVG</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:   { display: "flex", flexDirection: "column", gap: "12px" },
  empty:     { padding: "40px", textAlign: "center", color: "#aaa", fontSize: "13px", border: "2px dashed #eee", borderRadius: "8px" },
  title:     { fontSize: "14px", fontWeight: "500", color: "#333" },
  chips:     { display: "flex", gap: "12px", flexWrap: "wrap" },
  chip:      { padding: "8px 14px", background: "#f8f8f8", borderRadius: "8px", border: "1px solid #eee", display: "flex", flexDirection: "column", gap: "2px" },
  chipLabel: { fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" },
  chipValue: { fontSize: "15px", fontWeight: "500", fontFamily: "monospace" },
  exportBtn: { alignSelf: "flex-end", padding: "6px 14px", fontSize: "12px", cursor: "pointer", border: "1px solid #ddd", borderRadius: "6px", background: "transparent" },
  tooltip:   { background: "#1a1a2e", color: "#fff", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", minWidth: "140px" },
  ttLabel:   { fontWeight: "500", marginBottom: "6px", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "4px" },
  ttRow:     { display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "4px" },
  ttVal:     { fontFamily: "monospace" },
};