import { applyRandomNoise, generateNoiseMask } from "../../src/simulation/strategies/randomNoise";
import type { Matrix } from "@qrlab/types";

// 5×5 matrix of alternating BLACK/WHITE
const MOCK_MATRIX: Matrix = Array.from({ length: 5 }, (_, r) =>
  Array.from({ length: 5 }, (_, c) => ((r + c) % 2 === 0 ? "BLACK" : "WHITE"))
);

test("0% noise produces no CORRUPTED modules", () => {
  const result = applyRandomNoise(MOCK_MATRIX, { percentage: 0, seed: 1 });
  const corrupted = result.flat().filter((m) => m === "CORRUPTED");
  expect(corrupted).toHaveLength(0);
});

test("100% noise corrupts all BLACK/WHITE modules", () => {
  const result = applyRandomNoise(MOCK_MATRIX, { percentage: 100, seed: 1 });
  const corrupted = result.flat().filter((m) => m === "CORRUPTED");
  expect(corrupted).toHaveLength(25); // all 5×5 modules
});

test("same seed produces identical output", () => {
  const a = applyRandomNoise(MOCK_MATRIX, { percentage: 30, seed: 42 });
  const b = applyRandomNoise(MOCK_MATRIX, { percentage: 30, seed: 42 });
  expect(a).toEqual(b);
});

test("different seeds produce different output", () => {
  const a = applyRandomNoise(MOCK_MATRIX, { percentage: 50, seed: 1 });
  const b = applyRandomNoise(MOCK_MATRIX, { percentage: 50, seed: 2 });
  expect(a).not.toEqual(b);
});

test("original matrix is not mutated", () => {
  const original = MOCK_MATRIX.map((r) => [...r]);
  applyRandomNoise(MOCK_MATRIX, { percentage: 50, seed: 1 });
  expect(MOCK_MATRIX).toEqual(original);
});

test("RESERVED modules are never corrupted", () => {
  const matrixWithReserved: Matrix = MOCK_MATRIX.map((r) =>
    r.map((cell, c) => (c === 2 ? "RESERVED" : cell))
  );
  const result = applyRandomNoise(matrixWithReserved, { percentage: 100, seed: 1 });
  const col2 = result.map((r) => r[2]);
  expect(col2.every((m) => m === "RESERVED")).toBe(true);
});

test("throws on percentage > 100", () => {
  expect(() => applyRandomNoise(MOCK_MATRIX, { percentage: 101 })).toThrow(RangeError);
});