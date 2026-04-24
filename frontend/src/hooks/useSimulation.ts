// src/hooks/useSimulation.ts
import { useCallback, useRef } from "react";
import { runThresholdExperiment, getSimulationStatus, runHeatmapScan } from "../services/api";
import useSimulationStore from "../state/simulationStore";
import type { ExperimentConfig, ECLevel, HeatmapData } from "@qrlab/types";

interface UseSimulationReturn {
  runThreshold: (config: ExperimentConfig) => Promise<void>;
  runHeatmap:   (version: number, ecLevel: ECLevel) => Promise<HeatmapData>;
  cancel:       () => void;
}

export function useSimulation(): UseSimulationReturn {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    setJobId, setStatus, setProgress,
    setResults, setPartialResults, setHeatmap,
    reset,
  } = useSimulationStore();

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pollStatus = useCallback((jobId: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const status = await getSimulationStatus(jobId);
        setProgress(status.progress ?? 0);
        if (status.partialResults?.length) {
          setPartialResults(status.partialResults);
        }
        if (status.status === "done" && status.result) {
          stopPoll();
          setResults({
            dataPoints: status.result.dataPoints,
            threshold:  status.result.threshold,
          });
        } else if (status.status === "failed") {
          stopPoll();
          setStatus("failed");
        }
      } catch { /* keep polling on transient error */ }
    }, 2000);
  }, [stopPoll, setProgress, setPartialResults, setResults, setStatus]);

  const runThreshold = useCallback(async (config: ExperimentConfig): Promise<void> => {
    reset();
    setStatus("running");
    setProgress(0);
    try {
      const response = await runThresholdExperiment(config);
      if ("jobId" in response) {
        setJobId(response.jobId);
        pollStatus(response.jobId);
      } else {
        setResults({ dataPoints: response.dataPoints, threshold: response.threshold });
      }
    } catch (err) {
      setStatus("failed");
      throw err;
    }
  }, [reset, setStatus, setProgress, setJobId, setResults, pollStatus]);

  const runHeatmap = useCallback(async (version: number, ecLevel: ECLevel): Promise<HeatmapData> => {
    setStatus("running");
    setProgress(0);
    try {
      const { jobId } = await runHeatmapScan(null as any, version, ecLevel);
      setJobId(jobId);
      return new Promise((resolve, reject) => {
        stopPoll();
        pollRef.current = setInterval(async () => {
          try {
            const status = await getSimulationStatus(jobId);
            setProgress(status.progress ?? 0);
            if (status.status === "done" && status.result) {
              stopPoll(); setHeatmap(status.result); resolve(status.result);
            } else if (status.status === "failed") {
              stopPoll(); setStatus("failed"); reject(new Error(status.error ?? "Heatmap failed"));
            }
          } catch { /* keep polling */ }
        }, 2000);
      });
    } catch (err) {
      setStatus("failed"); throw err;
    }
  }, [setStatus, setProgress, setJobId, setHeatmap, stopPoll]);

  const cancel = useCallback(() => { stopPoll(); setStatus("idle"); }, [stopPoll, setStatus]);

  return { runThreshold, runHeatmap, cancel };
}