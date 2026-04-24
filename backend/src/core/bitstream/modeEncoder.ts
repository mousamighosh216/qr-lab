// src/core/bitstream/modeEncoder.ts
import type { Bits, Mode } from "@qrlab/types";

const ALPHA_TABLE: Record<string,number> = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15,"G":16,"H":17,"I":18,"J":19,"K":20,"L":21,"M":22,"N":23,"O":24,"P":25,"Q":26,"R":27,"S":28,"T":29,"U":30,"V":31,"W":32,"X":33,"Y":34,"Z":35," ":36,"$":37,"%":38,"*":39,"+":40,"-":41,".":42,"/":43,":":44};

function intToBits(v: number, len: number): Bits {
  const b: Bits=[];
  for (let i=len-1;i>=0;i--) b.push((v>>i)&1);
  return b;
}

export function encodeNumeric(input: string): Bits {
  const bits: Bits=[];
  for (let i=0;i<input.length;i+=3) {
    const chunk=input.slice(i,i+3);
    const len=chunk.length===3?10:chunk.length===2?7:4;
    bits.push(...intToBits(parseInt(chunk,10),len));
  }
  return bits;
}

export function getAlphanumericValue(char: string): number {
  const v=ALPHA_TABLE[char];
  if (v===undefined) throw new Error(`'${char}' not in alphanumeric set`);
  return v;
}

export function encodeAlphanumeric(input: string): Bits {
  const bits: Bits=[];
  for (let i=0;i<input.length;i+=2) {
    if (i+1<input.length) bits.push(...intToBits(getAlphanumericValue(input[i])*45+getAlphanumericValue(input[i+1]),11));
    else bits.push(...intToBits(getAlphanumericValue(input[i]),6));
  }
  return bits;
}

export function encodeByte(input: string): Bits {
  const bits: Bits=[];
  for (const b of Buffer.from(input,"utf8")) bits.push(...intToBits(b,8));
  return bits;
}

export function encodeKanji(input: string): Bits {
  const buf=Buffer.from(input,"binary");
  if (buf.length%2!==0) throw new Error("Kanji must have even byte length");
  const bits: Bits=[];
  for (let i=0;i<buf.length;i+=2) {
    const code=(buf[i]<<8)|buf[i+1];
    const v=code>=0x8140&&code<=0x9ffc?code-0x8140:code>=0xe040&&code<=0xebbf?code-0xc140:(() => {throw new Error(`Invalid kanji 0x${code.toString(16)}`)})();
    bits.push(...intToBits(((v>>8)&0xff)*0xc0+(v&0xff),13));
  }
  return bits;
}

export function encodeData(input: string, mode: Mode): Bits {
  switch(mode) {
    case "numeric":      return encodeNumeric(input);
    case "alphanumeric": return encodeAlphanumeric(input);
    case "byte":         return encodeByte(input);
    case "kanji":        return encodeKanji(input);
  }
}