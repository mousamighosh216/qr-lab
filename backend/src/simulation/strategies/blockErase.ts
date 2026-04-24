// src/simulation/strategies/blockErase.ts
import type { Matrix, ModuleValue, Coord, Rect } from "@qrlab/types";
export interface BlockEraseOptions { regions: Rect[]; }
export interface RandomBlockOptions { blockSizePercent:number; count:number; seed?:number; }
 
function mulberry32(seed:number){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/0x100000000;};}
 
const ERASABLE:Set<ModuleValue>=new Set(["BLACK","WHITE"]);
 
export function applyBlockErase(matrix:Matrix,options:BlockEraseOptions):Matrix{
  const r=matrix.map(row=>[...row] as ModuleValue[]);
  for(const reg of options.regions) for(let row=reg.y;row<reg.y+reg.height;row++) for(let col=reg.x;col<reg.x+reg.width;col++) if(row>=0&&row<r.length&&col>=0&&col<r[0].length&&ERASABLE.has(r[row][col])) r[row][col]="ERASED";
  return r;
}
 
export function applyRandomBlock(matrix:Matrix,options:RandomBlockOptions):Matrix{
  const n=matrix.length,size=Math.max(1,Math.round((options.blockSizePercent/100)*n)),rand=options.seed!==undefined?mulberry32(options.seed):Math.random.bind(Math);
  const regions:Rect[]=Array.from({length:options.count},()=>({x:Math.floor(rand()*(n-size)),y:Math.floor(rand()*(n-size)),width:size,height:size}));
  return applyBlockErase(matrix,{regions});
}
 
export function getErasedPositions(matrix:Matrix):Coord[]{
  const c:Coord[]=[];
  for(let r=0;r<matrix.length;r++) for(let col=0;col<matrix[r].length;col++) if(matrix[r][col]==="ERASED") c.push({row:r,col});
  return c;
}