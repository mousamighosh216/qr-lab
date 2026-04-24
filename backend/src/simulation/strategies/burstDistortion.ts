// src/simulation/strategies/burstDistortion.ts
import type { Matrix, ModuleValue } from "@qrlab/types";
export interface BurstOptions { angle:number; length:number; width:number; startRow:number; startCol:number; }
export interface BlurOptions  { flipProbability:number; seed?:number; }
export interface DistortionOptions { type:"barrel"|"pincushion"; strength:number; }

function mulberry32(seed:number){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/0x100000000;};}
const ERASABLE:Set<ModuleValue>=new Set(["BLACK","WHITE"]);

export function applyBurst(matrix:Matrix,o:BurstOptions):Matrix{
  const r=matrix.map(row=>[...row] as ModuleValue[]),n=r.length;
  const rad=(o.angle*Math.PI)/180,dx=Math.cos(rad),dy=Math.sin(rad),hw=Math.floor(o.width/2);
  for(let s=0;s<o.length;s++){
    const cr=Math.round(o.startRow+s*dy),cc=Math.round(o.startCol+s*dx);
    for(let dr=-hw;dr<=hw;dr++) for(let dc=-hw;dc<=hw;dc++){
      const rr=cr+dr,rc=cc+dc;
      if(rr>=0&&rr<n&&rc>=0&&rc<n&&ERASABLE.has(r[rr][rc])) r[rr][rc]="ERASED";
    }
  }
  return r;
}

export function applyGaussianBlur(matrix:Matrix,o:BlurOptions):Matrix{
  const r=matrix.map(row=>[...row] as ModuleValue[]),n=r.length;
  const rand=o.seed!==undefined?mulberry32(o.seed):Math.random.bind(Math);
  for(let row=0;row<n;row++) for(let col=0;col<n;col++){
    if(!ERASABLE.has(r[row][col])) continue;
    const onB=[[row-1,col],[row+1,col],[row,col-1],[row,col+1]].some(([nr,nc])=>nr>=0&&nr<n&&nc>=0&&nc<n&&ERASABLE.has(r[nr][nc])&&r[nr][nc]!==r[row][col]);
    if(onB&&rand()<o.flipProbability) r[row][col]="CORRUPTED";
  }
  return r;
}

export function applyStructuredDistortion(matrix:Matrix,o:DistortionOptions):Matrix{
  const n=matrix.length,r=matrix.map(row=>[...row] as ModuleValue[]);
  const k=o.strength*(o.type==="barrel"?1:-1),cx=(n-1)/2,cy=(n-1)/2;
  for(let row=0;row<n;row++) for(let col=0;col<n;col++){
    const nx=(col-cx)/cx,ny=(row-cy)/cy,rr=Math.sqrt(nx*nx+ny*ny),f=1+k*rr*rr;
    const sc=Math.round(cx+nx*f*cx),sr=Math.round(cy+ny*f*cy);
    if(sr<0||sr>=n||sc<0||sc>=n){if(ERASABLE.has(r[row][col]))r[row][col]="ERASED";}
    else r[row][col]=matrix[sr][sc];
  }
  return r;
}