// src/core/bitstream/padder.ts
import type { Bits, ECLevel } from "@qrlab/types";
import { getTotalDataCodewords } from "../qr/version";

const FILL: Bits[]=[[1,1,1,0,1,1,0,0],[0,0,0,1,0,0,0,1]];

export function getDataCodewordCapacity(version: number, ecLevel: ECLevel): number {
  return getTotalDataCodewords(version,ecLevel);
}

export function appendTerminator(bits: Bits, cap: number): Bits {
  const r=[...bits];
  for (let i=0;i<4&&r.length<cap;i++) r.push(0);
  return r;
}

export function byteAlign(bits: Bits): Bits {
  const r=[...bits];
  while(r.length%8!==0) r.push(0);
  return r;
}

export function appendFillBytes(bits: Bits, capBytes: number): Bits {
  const r=[...bits]; let fi=0;
  while(r.length<capBytes*8){ r.push(...FILL[fi%2]); fi++; }
  return r;
}

export function pad(bits: Bits, version: number, ecLevel: ECLevel): Bits {
  const capB=getDataCodewordCapacity(version,ecLevel);
  let r=appendTerminator(bits,capB*8);
  r=byteAlign(r);
  r=appendFillBytes(r,capB);
  if(r.length!==capB*8) throw new Error(`Pad error: got ${r.length} bits, expected ${capB*8}`);
  return r;
}

export function bitsToCodewords(bits: Bits): number[] {
  if(bits.length%8!==0) throw new Error("Bitstream not byte-aligned");
  const cw: number[]=[];
  for (let i=0;i<bits.length;i+=8) {
    let b=0;
    for (let j=0;j<8;j++) b=(b<<1)|bits[i+j];
    cw.push(b);
  }
  return cw;
}