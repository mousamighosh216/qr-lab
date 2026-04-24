// src/utils/binaryUtils.ts
import type { Bits } from "@qrlab/types";

export function numberToBits(n: number, length: number): Bits {
  const bits: Bits = [];
  for(let i=length-1;i>=0;i--) bits.push((n>>i)&1);
  return bits;
}

export function bitsToNumber(bits: Bits): number {
  return bits.reduce((acc,b)=>(acc<<1)|b,0);
}

export function bitsToBytes(bits: Bits): number[] {
  const bytes: number[] = [];
  for(let i=0;i<bits.length;i+=8){
    let b=0;
    for(let j=0;j<8;j++) b=(b<<1)|(bits[i+j]??0);
    bytes.push(b);
  }
  return bytes;
}

export function bytesToBits(bytes: number[]): Bits {
  const bits: Bits = [];
  for(const b of bytes) for(let i=7;i>=0;i--) bits.push((b>>i)&1);
  return bits;
}

export function xorBits(a: Bits, b: Bits): Bits {
  return a.map((bit,i)=>bit^(b[i]??0));
}