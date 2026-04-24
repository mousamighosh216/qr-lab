// src/hooks/useQRGenerator.ts
import { useState, useCallback } from "react";
import { generateQR } from "../services/api";
import useQRStore from "../state/qrStore";
import type { ECLevel } from "@qrlab/types";

interface UseQRGeneratorReturn {
  generate: (input: string, ecLevel: ECLevel, version?: number) => Promise<void>;
  loading:  boolean;
  error:    string | null;
}

export function useQRGenerator(): UseQRGeneratorReturn {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const setGeneratedQR = useQRStore((s) => s.setGeneratedQR);

  const generate = useCallback(async (
    input:    string,
    ecLevel:  ECLevel,
    version?: number
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateQR(input, ecLevel, version);
      setGeneratedQR(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [setGeneratedQR]);

  return { generate, loading, error };
}