// src/core/qr/mask.ts
import type { Matrix, ModuleValue } from "@qrlab/types";
import { cloneMatrix } from "./matrix";

type MaskFn=(r:number,c:number)=>boolean;
const MASKS: MaskFn[]=[
  (r,c)=>(r+c)%2===0,(r)=>r%2===0,(_,c)=>c%3===0,(r,c)=>(r+c)%3===0,
  (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>((r*c)%2+(r*c)%3)===0,
  (r,c)=>(((r*c)%2+(r*c)%3))%2===0,(r,c)=>(((r+c)%2+(r*c)%3))%2===0,
];

export function getMaskFunction(id: number): MaskFn {
  if(id<0||id>7) throw new RangeError(`Mask ID must be 0–7`);
  return MASKS[id];
}

const MASKABLE: Set<ModuleValue>=new Set(["BLACK","WHITE"]);

export function applyMask(matrix: Matrix, id: number): Matrix {
  const fn=getMaskFunction(id), m=cloneMatrix(matrix), n=m.length;
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) {
    if(!MASKABLE.has(m[r][c])) continue;
    if(fn(r,c)) m[r][c]=m[r][c]==="BLACK"?"WHITE":"BLACK";
  }
  return m;
}

function pen1(m: Matrix): number {
  const n=m.length; let p=0;
  const score=(run:number)=>run>=5?3+(run-5):0;
  for(let r=0;r<n;r++){let run=1;for(let c=1;c<n;c++){if(m[r][c]===m[r][c-1])run++;else{p+=score(run);run=1;}}p+=score(run);}
  for(let c=0;c<n;c++){let run=1;for(let r=1;r<n;r++){if(m[r][c]===m[r-1][c])run++;else{p+=score(run);run=1;}}p+=score(run);}
  return p;
}
function pen2(m: Matrix): number {
  const n=m.length; let p=0;
  for(let r=0;r<n-1;r++) for(let c=0;c<n-1;c++) {
    const v=m[r][c]; if(m[r][c+1]===v&&m[r+1][c]===v&&m[r+1][c+1]===v) p+=3;
  }
  return p;
}
function pen3(m: Matrix): number {
  const n=m.length; let p=0;
  const p1=[1,0,1,1,1,0,1,0,0,0,0],p2=[0,0,0,0,1,0,1,1,1,0,1];
  const B="BLACK";
  const chk=(bits:ModuleValue[],pat:number[])=>pat.every((b,i)=>(b===1)===(bits[i]===B));
  for(let r=0;r<n;r++) for(let c=0;c<=n-11;c++){const sl=m[r].slice(c,c+11) as ModuleValue[];if(chk(sl,p1)||chk(sl,p2))p+=40;}
  for(let c=0;c<n;c++) for(let r=0;r<=n-11;r++){const sl=Array.from({length:11},(_,i)=>m[r+i][c]);if(chk(sl,p1)||chk(sl,p2))p+=40;}
  return p;
}
function pen4(m: Matrix): number {
  const n=m.length,total=n*n; let dark=0;
  for(const row of m) for(const cell of row) if(cell==="BLACK") dark++;
  const pct=(dark/total)*100,prev=Math.floor(pct/5)*5;
  return (Math.min(Math.abs(prev-50),Math.abs(prev+5-50))/5)*10;
}

export function evaluatePenalty(m: Matrix): number { return pen1(m)+pen2(m)+pen3(m)+pen4(m); }

export interface MaskResult { maskId:number; maskedMatrix:Matrix; penalty:number; }

export function selectBestMask(matrix: Matrix): MaskResult {
  let best: MaskResult|null=null;
  for(let id=0;id<8;id++){
    const mm=applyMask(matrix,id), p=evaluatePenalty(mm);
    if(!best||p<best.penalty) best={maskId:id,maskedMatrix:mm,penalty:p};
  }
  return best!;
}