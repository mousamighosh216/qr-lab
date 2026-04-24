// src/core/errorCorrection/polynomial.ts
// Polynomials as number[] — index 0 = highest degree.

import { add, multiply, divide } from "./gf256";

export type Poly = number[];

function trim(p: Poly): Poly {
  let s = 0;
  while (s < p.length - 1 && p[s] === 0) s++;
  return p.slice(s);
}

export function degree(p: Poly): number { return trim(p).length - 1; }

export function polyAdd(p: Poly, q: Poly): Poly {
  const len = Math.max(p.length, q.length);
  const r   = new Array(len).fill(0);
  for (let i = 0; i < p.length; i++) r[len - p.length + i] ^= p[i];
  for (let i = 0; i < q.length; i++) r[len - q.length + i] ^= q[i];
  return trim(r);
}

export function polyMultiply(p: Poly, q: Poly): Poly {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++)
    for (let j = 0; j < q.length; j++)
      r[i + j] ^= multiply(p[i], q[j]);
  return r;
}

export function polyDivide(dividend: Poly, divisor: Poly): { quotient: Poly; remainder: Poly } {
  let rem = [...dividend];
  const quot: number[] = [];
  const dLen = trim(divisor).length;
  while (rem.length >= dLen) {
    const coeff = divide(rem[0], divisor[0]);
    quot.push(coeff);
    if (coeff !== 0)
      for (let i = 0; i < dLen; i++) rem[i] ^= multiply(coeff, divisor[i]);
    rem = rem.slice(1);
  }
  return { quotient: trim(quot), remainder: rem };
}

export function evaluatePolynomial(poly: Poly, x: number): number {
  let result = 0;
  for (const c of poly) result = add(multiply(result, x), c);
  return result;
}

function pow2(exp: number): number {
  let x = 1;
  for (let i = 0; i < exp; i++) { x <<= 1; if (x & 0x100) x ^= 0x11d; }
  return x;
}

const GENERATOR_CACHE = new Map<number, Poly>();

export function buildGeneratorPolynomial(deg: number): Poly {
  if (GENERATOR_CACHE.has(deg)) return GENERATOR_CACHE.get(deg)!;
  let g: Poly = [1];
  for (let i = 0; i < deg; i++) g = polyMultiply(g, [1, pow2(i)]);
  GENERATOR_CACHE.set(deg, g);
  return g;
}