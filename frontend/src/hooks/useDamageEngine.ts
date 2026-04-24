// src/hooks/useDamageEngine.ts
import { useState, useCallback, useRef } from "react";
import { applyDamage, previewDamage, decodeMatrix } from "../services/api";
import useQRStore from "../state/qrStore";
import type { Matrix, DamageConfig, ECLevel } from "@qrlab/types";
import type { DamageResult } from "@qrlab/types";

interface UseDamageEngineReturn {
  apply:   (matrix: Matrix, config: DamageConfig, ecLevel?: ECLevel) => Promise<DamageResult | null>;
  preview: (matrix: Matrix, config: DamageConfig, ecLevel?: ECLevel, onResult?: (r: DamageResult) => void, ms?: number) => void;
  decode:  (matrix: Matrix, version: number, ecLevel: ECLevel) => Promise<void>;
  loading: boolean;
  error:   string | null;
}

export function useDamageEngine(): UseDamageEngineReturn {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDamagedMatrix = useQRStore((s) => s.setDamagedMatrix);
  const setDecodeResult  = useQRStore((s) => s.setDecodeResult);
  const storeECLevel     = useQRStore((s) => s.ecLevel);
  const storeVersion     = useQRStore((s) => s.version);

  const apply = useCallback(async (
    matrix:   Matrix,
    config:   DamageConfig,
    ecLevel?: ECLevel
  ): Promise<DamageResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await applyDamage(matrix, config, ecLevel ?? storeECLevel);
      setDamagedMatrix(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Damage failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [setDamagedMatrix, storeECLevel]);

  const preview = useCallback((
    matrix:    Matrix,
    config:    DamageConfig,
    ecLevel?:  ECLevel,
    onResult?: (r: DamageResult) => void,
    debounceMs = 120
  ): void => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await previewDamage(matrix, config, ecLevel ?? storeECLevel);
        onResult?.(result);
      } catch {
        // Preview errors are silent
      }
    }, debounceMs);
  }, [storeECLevel]);

  const decode = useCallback(async (
    matrix:  Matrix,
    version: number,
    ecLevel: ECLevel
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await decodeMatrix(matrix, version ?? storeVersion!, ecLevel ?? storeECLevel);
      setDecodeResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decode failed");
    } finally {
      setLoading(false);
    }
  }, [setDecodeResult, storeVersion, storeECLevel]);

  return { apply, preview, decode, loading, error };
}