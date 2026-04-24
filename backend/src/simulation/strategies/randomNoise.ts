// src/simulation/strategies/randomNoise.ts
import type { Matrix, ModuleValue } from "@qrlab/types";
export interface RandomNoiseOptions { percentage:number; seed?:number; }

function mulberry32(seed:number){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/0x100000000;};}

export function generateNoiseMask(rows:number,cols:number,pct:number,seed?:number):boolean[][]{
  if(pct<0||pct>100) throw new RangeError(`Noise percentage must be 0–100, got ${pct}`);
  const rand=seed!==undefined?mulberry32(seed):Math.random.bind(Math),thr=pct/100;
  return Array.from({length:rows},()=>Array.from({length:cols},()=>rand()<thr));
}

const FLIPPABLE:Set<ModuleValue>=new Set(["BLACK","WHITE"]);

export function applyRandomNoise(matrix:Matrix,options:RandomNoiseOptions):Matrix{
  const rows=matrix.length,cols=matrix[0]?.length??0;
  const mask=generateNoiseMask(rows,cols,options.percentage,options.seed);
  return matrix.map((row,r)=>row.map((cell,c):ModuleValue=>(!mask[r][c]||!FLIPPABLE.has(cell))?cell:"CORRUPTED"));
}