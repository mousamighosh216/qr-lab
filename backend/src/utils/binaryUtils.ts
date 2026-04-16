import { Bits } from "@qrlab/types";

export function numberToBits(n: number, length: number): Bits {
  const bits: Bits = [];
  for (let i = length - 1; i >= 0; i--) {
    bits.push((n >> i) & 1);
  }
  return bits;
}

export function bitsToNumber(bits: Bits): number {
    let result=0;
    for (const bit of bits){
        if(bit!==0 && bit!==1){
            throw new Error(`Invalid bit: ${bit}`);
        }
        result=(result<<1) | bit;
    }
    return result;
}

export function bitsToBytes(bits: Bits): number[] {
    const bytes: number[] = [];
    for(let i=0;i<bits.length;i+=8){
        let byte=0;
        for(let j=0;i<8;j++){
            byte<<=1;
            if(i+j<bits.length){
                const bit=bits[i+j];
                if(bit!==0 && bit!==1){
                    throw new Error(`Invalid bit: ${bit}`);
                }
                byte|=bit;
            }
        }
        bytes.push(byte);
    }
    return bytes;
}

export function bytesToBits(bytes: number[]): Bits {
  const bits: Bits = [];
  for (const byte of bytes) {
    if (byte < 0 || byte > 255) {
      throw new Error(`Invalid byte: ${byte}`);
    }
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }
  return bits;
}

export function xorBits(a: Bits, b: Bits): Bits {
    if (a.length !== b.length) {
        throw new Error('Bit arrays must be of equal length');
    }
    const result: Bits = [];
    for (let i = 0; i < a.length; i++) {
        const bitA = a[i];
        const bitB = b[i];
        if ((bitA !== 0 && bitA !== 1) || (bitB !== 0 && bitB !== 1)) {
            throw new Error(`Invalid bits at index ${i}: ${bitA}, ${bitB}`);
        }
        result.push(bitA ^ bitB);
    }
  return result;
}