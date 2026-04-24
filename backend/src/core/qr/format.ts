// src/core/qr/format.ts
import type { Matrix, ModuleValue, Bits, ECLevel } from "@qrlab/types";
import { setModule } from "./matrix";

const EC_BITS: Record<ECLevel,[number,number]>={L:[0,1],M:[0,0],Q:[1,1],H:[1,0]};
const FORMAT_MASK=0b101010000010010;

function n2b(v: number, len: number): Bits { const b: Bits=[]; for(let i=len-1;i>=0;i--) b.push((v>>i)&1); return b; }

function bchFormat(data: number): number {
  let r=data<<10;
  for(let i=4;i>=0;i--) if((r>>(i+10))&1) r^=0x537<<i;
  return r&0x3ff;
}

function bchVersion(data: number): number {
  let r=data<<12;
  for(let i=5;i>=0;i--) if((r>>(i+12))&1) r^=0x1f25<<i;
  return r&0xfff;
}

export function encodeFormatString(ecLevel: ECLevel, maskId: number): Bits {
  if(maskId<0||maskId>7) throw new RangeError("Mask ID must be 0–7");
  const [e1,e0]=EC_BITS[ecLevel];
  const data=(e1<<4)|(e0<<3)|(maskId&0b111);
  return n2b((data<<10|bchFormat(data))^FORMAT_MASK,15);
}

export function writeFormatInfo(m: Matrix, bits: Bits) {
  const n=m.length;
  let bi=0;
  for(let c=0;c<=8;c++) if(c!==6) setModule(m,8,c,bits[bi++]===1?"BLACK":"WHITE");
  bi=7;
  for(let r=7;r>=0;r--){if(r===6)continue;setModule(m,r,8,bits[bi--]===1?"BLACK":"WHITE");if(bi<0)break;}
  for(let c=n-1;c>=n-8;c--) setModule(m,8,c,bits[n-1-c]===1?"BLACK":"WHITE");
  for(let r=n-7;r<n;r++) setModule(m,r,8,bits[r-(n-7)]===1?"BLACK":"WHITE");
}

export function encodeVersionString(version: number): Bits {
  if(version<7||version>40) throw new RangeError(`Version info only for V7–V40`);
  return n2b((version<<12)|bchVersion(version),18);
}

export function writeVersionInfo(m: Matrix, bits: Bits, version: number) {
  if(version<7) return;
  const n=m.length; let idx=0;
  for(let c=n-11;c<n-8;c++) for(let r=0;r<6;r++) setModule(m,r,c,bits[idx++]===1?"BLACK":"WHITE");
  idx=0;
  for(let r=n-11;r<n-8;r++) for(let c=0;c<6;c++) setModule(m,r,c,bits[idx++]===1?"BLACK":"WHITE");
}