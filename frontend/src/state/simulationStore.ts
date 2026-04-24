// src/state/simulationStore.ts
import { create } from "zustand";
import type { ExperimentConfig, DataPoint, ECLevel } from "@qrlab/types";
import type { ThresholdResult } from "@qrlab/types";

type JobStatus = "idle" | "running" | "done" | "failed";

interface SimulationState {
  experimentConfig: ExperimentConfig;
  setConfig:   (partial: Partial<ExperimentConfig>) => void;
  resetConfig: () => void;

  jobId:    string | null;
  status:   JobStatus;
  progress: number;
  setJobId:    (id: string) => void;
  setStatus:   (s: JobStatus) => void;
  setProgress: (p: number)   => void;

  dataPoints:     DataPoint[];
  threshold:      ThresholdResult["threshold"] | null;
  heatmap:        number[][] | null;
  regionAnalysis: any[];
  setResults:        (r: { dataPoints: DataPoint[]; threshold: ThresholdResult["threshold"] }) => void;
  setPartialResults: (dp: DataPoint[]) => void;
  setHeatmap:        (report: any) => void;

  reset: () => void;
}

const DEFAULT_CONFIG: ExperimentConfig = {
  version:       1,
  ecLevel:       "M",
  damageType:    "randomNoise",
  minPercent:    0,
  maxPercent:    40,
  steps:         9,
  trialsPerStep: 20,
};

const useSimulationStore = create<SimulationState>((set, get) => ({
  experimentConfig: { ...DEFAULT_CONFIG },
  setConfig:   (partial) => set({ experimentConfig: { ...get().experimentConfig, ...partial } }),
  resetConfig: () => set({ experimentConfig: { ...DEFAULT_CONFIG } }),

  jobId:    null,
  status:   "idle",
  progress: 0,
  setJobId:    (jobId)    => set({ jobId }),
  setStatus:   (status)   => set({ status }),
  setProgress: (progress) => set({ progress }),

  dataPoints:     [],
  threshold:      null,
  heatmap:        null,
  regionAnalysis: [],

  setResults: ({ dataPoints, threshold }) =>
    set({ dataPoints, threshold, status: "done", progress: 100 }),

  setPartialResults: (dataPoints) => set({ dataPoints }),

  setHeatmap: (report) =>
    set({ heatmap: report.heatmap, regionAnalysis: report.regions }),

  reset: () =>
    set({
      jobId: null, status: "idle", progress: 0,
      dataPoints: [], threshold: null,
      heatmap: null, regionAnalysis: [],
    }),
}));

export default useSimulationStore;