// src/core/errorCorrection/gf256.ts
// GF(2^8) arithmetic. Irreducible poly: x^8+x^4+x^3+x^2+1 = 0x11D. Primitive: α=2.

const PRIMITIVE = 0x11d;

export function buildLogTable(): number[] {
  const log = new Array(256).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    log[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= PRIMITIVE;
  }
  return log;
}

export function buildAntilogTable(): number[] {
  const antilog = new Array(512).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    antilog[i] = x;
    antilog[i + 255] = x;
    x <<= 1;
    if (x & 0x100) x ^= PRIMITIVE;
  }
  antilog[255] = 1;
  return antilog;
}

export const LOG    = buildLogTable();
export const ANTILOG = buildAntilogTable();

export function add(a: number, b: number): number { return a ^ b; }

export function multiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return ANTILOG[LOG[a] + LOG[b]];
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error("GF(256): division by zero");
  if (a === 0) return 0;
  return ANTILOG[(LOG[a] - LOG[b] + 255) % 255];
}

export function pow(base: number, exponent: number): number {
  if (exponent === 0) return 1;
  if (base === 0) return 0;
  return ANTILOG[(LOG[base] * exponent) % 255];
}

export function inverse(a: number): number {
  if (a === 0) throw new Error("GF(256): zero has no inverse");
  return ANTILOG[255 - LOG[a]];
}