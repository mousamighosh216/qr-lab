// src/decoder/scanner.ts
import type { Matrix, ModuleValue, ECLevel } from "@qrlab/types";

export interface FormatInfo { ecLevel: ECLevel; maskId: number; }

const EC_LEVEL_MAP: Record<number, ECLevel> = { 0b01:"L", 0b00:"M", 0b11:"Q", 0b10:"H" };
const FORMAT_XOR_MASK = 0b101010000010010;
const FORMAT_COORDS_1: [number,number][] = [
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
  [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
];

function getCoords2(n: number): [number,number][] {
  const c: [number,number][] = [];
  for (let col=n-1;col>=n-8;col--) c.push([8,col]);
  for (let row=n-7;row<n;row++)    c.push([row,8]);
  return c;
}

function bchFormat(data: number): number {
  let r=data<<10;
  for (let i=4;i>=0;i--) if ((r>>(i+10))&1) r^=0x537<<i;
  return r&0x3ff;
}

function readBits(matrix: Matrix, coords: [number,number][]): number {
  let v=0;
  for (const [r,c] of coords) v=(v<<1)|(matrix[r]?.[c]==="BLACK"?1:0);
  return v;
}

function decodeFormat(raw: number): FormatInfo | null {
  const u=raw^FORMAT_XOR_MASK, d=(u>>10)&0x1f, b=u&0x3ff;
  if (bchFormat(d)!==b) return null;
  const ec=EC_LEVEL_MAP[(d>>3)&0b11];
  if (!ec) return null;
  return {ecLevel:ec,maskId:d&0b111};
}

export function readFormatInfo(matrix: Matrix): FormatInfo | null {
  const n=matrix.length;
  const p=readBits(matrix,FORMAT_COORDS_1);
  const d1=decodeFormat(p); if (d1) return d1;
  const s=readBits(matrix,getCoords2(n));
  const d2=decodeFormat(s); if (d2) return d2;
  for (let bit=0;bit<15;bit++) { const a=decodeFormat(p^(1<<bit)); if (a) return a; }
  return null;
}

export function inferVersion(matrix: Matrix): number { return (matrix.length-17)/4; }

export function samplePixelBuffer(data: Uint8ClampedArray, w: number, h: number, version: number, quiet=4): Matrix {
  const n=version*4+17, ms=w/(n+quiet*2), matrix: Matrix=[];
  for (let r=0;r<n;r++) {
    const row: ModuleValue[]=[];
    for (let c=0;c<n;c++) {
      const px=Math.floor((c+quiet+0.5)*ms), py=Math.floor((r+quiet+0.5)*ms);
      const idx=(py*w+px)*4;
      const lum=0.299*(data[idx]??255)+0.587*(data[idx+1]??255)+0.114*(data[idx+2]??255);
      row.push(lum<128?"BLACK":"WHITE");
    }
    matrix.push(row);
  }
  return matrix;
}