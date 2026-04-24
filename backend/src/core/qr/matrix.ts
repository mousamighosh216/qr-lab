// src/core/qr/matrix.ts
import type { Matrix, ModuleValue, Coord } from "@qrlab/types";
import { getModuleCount } from "./version";

export interface DiffResult { corrupted: Coord[]; changed: number; percentage: number; }

export function createMatrix(version: number): Matrix {
  const n=getModuleCount(version);
  return Array.from({length:n},()=>Array.from({length:n},():ModuleValue=>"EMPTY"));
}

export function setModule(m: Matrix, r: number, c: number, v: ModuleValue, strict=false): void {
  const n=m.length;
  if(r<0||r>=n||c<0||c>=n) throw new RangeError(`(${r},${c}) out of bounds for ${n}×${n}`);
  if(strict&&m[r][c]==="RESERVED") throw new Error(`Cannot overwrite RESERVED at (${r},${c})`);
  m[r][c]=v;
}

export function getModule(m: Matrix, r: number, c: number): ModuleValue {
  const n=m.length;
  if(r<0||r>=n||c<0||c>=n) throw new RangeError(`(${r},${c}) out of bounds for ${n}×${n}`);
  return m[r][c];
}

export function cloneMatrix(m: Matrix): Matrix { return m.map(r=>[...r]); }

export function diffMatrix(original: Matrix, damaged: Matrix): DiffResult {
  const n=original.length; const corrupted: Coord[]=[]; let eligible=0;
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
    const o=original[r][c];
    if(o!=="BLACK"&&o!=="WHITE") continue;
    eligible++;
    if(damaged[r][c]!==o) corrupted.push({row:r,col:c});
  }
  return {corrupted,changed:corrupted.length,percentage:eligible>0?parseFloat(((corrupted.length/eligible)*100).toFixed(2)):0};
}