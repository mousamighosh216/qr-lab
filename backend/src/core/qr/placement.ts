// src/core/qr/placement.ts
import type { Matrix, ModuleValue, Bits } from "@qrlab/types";
import { setModule, getModule } from "./matrix";
import { getAlignmentPatternCenters, getModuleCount } from "./version";
 
function fillRect(m: Matrix, sr: number, sc: number, rows: number, cols: number, v: ModuleValue) {
  for(let r=sr;r<sr+rows;r++) for(let c=sc;c<sc+cols;c++) setModule(m,r,c,v);
}
 
function drawFinder(m: Matrix, tr: number, lc: number) {
  for(let i=0;i<7;i++){setModule(m,tr,lc+i,"BLACK");setModule(m,tr+6,lc+i,"BLACK");setModule(m,tr+i,lc,"BLACK");setModule(m,tr+i,lc+6,"BLACK");}
  fillRect(m,tr+1,lc+1,5,5,"WHITE");
  fillRect(m,tr+2,lc+2,3,3,"BLACK");
}
 
function inFinderZone(r: number, c: number, n: number): boolean {
  return (r<=8&&c<=8)||(r<=8&&c>=n-8)||(r>=n-8&&c<=8);
}
 
export function placeFinderPatterns(m: Matrix) { const n=m.length; drawFinder(m,0,0); drawFinder(m,0,n-7); drawFinder(m,n-7,0); }
 
export function placeSeparators(m: Matrix) {
  const n=m.length;
  for(let i=0;i<8;i++){setModule(m,7,i,"WHITE");setModule(m,i,7,"WHITE");setModule(m,7,n-1-i,"WHITE");setModule(m,i,n-8,"WHITE");setModule(m,n-8,i,"WHITE");setModule(m,n-1-i,7,"WHITE");}
}
 
export function placeTimingPatterns(m: Matrix) {
  const n=m.length;
  for(let i=8;i<n-8;i++){setModule(m,6,i,i%2===0?"BLACK":"WHITE");setModule(m,i,6,i%2===0?"BLACK":"WHITE");}
}
 
export function placeAlignmentPatterns(m: Matrix, version: number) {
  const centers=getAlignmentPatternCenters(version); if(!centers.length) return;
  const n=m.length;
  for(const r of centers) for(const c of centers) {
    if(inFinderZone(r,c,n)) continue;
    for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++) setModule(m,r+dr,c+dc,Math.abs(dr)===2||Math.abs(dc)===2?"BLACK":"WHITE");
    setModule(m,r,c,"BLACK");
  }
}
 
export function placeDarkModule(m: Matrix, version: number) { setModule(m,4*version+9,8,"BLACK"); }
 
export function reserveFormatRegions(m: Matrix) {
  const n=m.length;
  for(let c=0;c<=8;c++) if(c!==6) setModule(m,8,c,"RESERVED");
  for(let r=0;r<=8;r++) if(r!==6) setModule(m,r,8,"RESERVED");
  for(let c=n-8;c<n;c++) setModule(m,8,c,"RESERVED");
  for(let r=n-7;r<n;r++) setModule(m,r,8,"RESERVED");
}
 
export function reserveVersionRegions(m: Matrix, version: number) {
  if(version<7) return;
  const n=m.length;
  for(let r=0;r<6;r++) for(let c=n-11;c<n-8;c++) setModule(m,r,c,"RESERVED");
  for(let r=n-11;r<n-8;r++) for(let c=0;c<6;c++) setModule(m,r,c,"RESERVED");
}
 
export function placeDataModules(m: Matrix, bits: Bits) {
  const n=m.length; let bi=0, goingUp=true;
  for(let col=n-1;col>=1;col-=2) {
    const right=col===6?5:col, left=right-1;
    const rs=goingUp?n-1:0, re=goingUp?-1:n, rStep=goingUp?-1:1;
    for(let row=rs;row!==re;row+=rStep) for(const c of [right,left]) {
      if(getModule(m,row,c)==="EMPTY") setModule(m,row,c,bi<bits.length?(bits[bi++]===1?"BLACK":"WHITE"):"WHITE");
    }
    goingUp=!goingUp;
  }
}

