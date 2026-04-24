// src/decoder/extractor.ts
import type { Matrix, ModuleValue, Bits, Mode, ECLevel } from "@qrlab/types";
import { getMaskFunction } from "../core/qr/mask";
import { getECBlockConfig } from "../core/qr/version";
import type { Block } from "../core/errorCorrection/reedSolomon";

const UNMASKABLE: Set<ModuleValue> = new Set(["EMPTY","RESERVED","ERASED","CORRUPTED","RECOVERED"]);

export function removeMask(matrix: Matrix, maskId: number): Matrix {
  const fn=getMaskFunction(maskId);
  return matrix.map((row,r) => row.map((cell,c): ModuleValue => {
    if (UNMASKABLE.has(cell)) return cell;
    if (fn(r,c)) return cell==="BLACK"?"WHITE":"BLACK";
    return cell;
  }));
}

export function extractBitstream(matrix: Matrix): Bits {
  const n=matrix.length, bits: Bits=[];
  let goingUp=true;
  for (let col=n-1;col>=1;col-=2) {
    const right=col===6?5:col, left=right-1;
    const rStart=goingUp?n-1:0, rEnd=goingUp?-1:n, rStep=goingUp?-1:1;
    for (let row=rStart;row!==rEnd;row+=rStep) {
      for (const c of [right,left]) {
        const cell=matrix[row][c];
        if (cell==="BLACK"||cell==="WHITE") bits.push(cell==="BLACK"?1:0);
        else if (cell==="ERASED"||cell==="CORRUPTED") bits.push(0);
      }
    }
    goingUp=!goingUp;
  }
  return bits;
}

export function separateBlocks(bits: Bits, version: number, ecLevel: ECLevel): Block[] {
  const config=getECBlockConfig(version,ecLevel);
  const descs: {dataLen:number;ecLen:number}[]=[];
  for (const {count,dataCodewords,ecCodewordsPerBlock} of config)
    for (let i=0;i<count;i++) descs.push({dataLen:dataCodewords,ecLen:ecCodewordsPerBlock});
  const blocks: Block[]=descs.map(()=>({data:[],ec:[]}));
  const cw: number[]=[];
  for (let i=0;i+7<bits.length;i+=8) {
    let byte=0;
    for (let b=0;b<8;b++) byte=(byte<<1)|(bits[i+b]??0);
    cw.push(byte);
  }
  let idx=0;
  const maxD=Math.max(...descs.map(d=>d.dataLen));
  for (let i=0;i<maxD;i++) for (let b=0;b<descs.length;b++) if (i<descs[b].dataLen&&idx<cw.length) blocks[b].data.push(cw[idx++]);
  const maxE=Math.max(...descs.map(d=>d.ecLen));
  for (let i=0;i<maxE;i++) for (let b=0;b<descs.length;b++) if (i<descs[b].ecLen&&idx<cw.length) blocks[b].ec.push(cw[idx++]);
  return blocks;
}

const CC_BITS: Record<Mode,[number,number,number]>={numeric:[10,12,14],alphanumeric:[9,11,13],byte:[8,16,16],kanji:[8,10,12]};
const MODE_MAP: Record<number,Mode>={0b0001:"numeric",0b0010:"alphanumeric",0b0100:"byte",0b1000:"kanji"};
const ALPHA="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

function b2i(bits: Bits, off: number, len: number): number {
  let v=0; for (let i=0;i<len;i++) v=(v<<1)|(bits[off+i]??0); return v;
}

export function readModeIndicator(bits: Bits, offset: number) {
  const ind=b2i(bits,offset,4);
  if (ind===0) return null;
  const mode=MODE_MAP[ind];
  if (!mode) return null;
  return {mode,bitsRead:4};
}

export function readCharacterCount(bits: Bits, offset: number, mode: Mode, version: number) {
  const [a,b,c]=CC_BITS[mode];
  const len=version<=9?a:version<=26?b:c;
  return {count:b2i(bits,offset,len),bitsRead:len};
}

export function extractPayload(bits: Bits, mode: Mode, charCount: number, offset: number): {text:string;bitsRead:number} {
  let text="",bitsRead=0;
  switch(mode) {
    case "numeric": {
      let rem=charCount;
      while(rem>=3){text+=b2i(bits,offset+bitsRead,10).toString().padStart(3,"0");bitsRead+=10;rem-=3;}
      if(rem===2){text+=b2i(bits,offset+bitsRead,7).toString().padStart(2,"0");bitsRead+=7;}
      else if(rem===1){text+=b2i(bits,offset+bitsRead,4).toString();bitsRead+=4;}
      break;
    }
    case "alphanumeric": {
      let rem=charCount;
      while(rem>=2){const v=b2i(bits,offset+bitsRead,11);text+=ALPHA[Math.floor(v/45)]+ALPHA[v%45];bitsRead+=11;rem-=2;}
      if(rem===1){text+=ALPHA[b2i(bits,offset+bitsRead,6)];bitsRead+=6;}
      break;
    }
    case "byte": {
      const bytes: number[]=[];
      for(let i=0;i<charCount;i++){bytes.push(b2i(bits,offset+bitsRead,8));bitsRead+=8;}
      text=Buffer.from(bytes).toString("utf8");
      break;
    }
    case "kanji": {
      for(let i=0;i<charCount;i++){
        const v=b2i(bits,offset+bitsRead,13);
        const h=Math.floor(v/0xc0),l=v%0xc0,code=(h<<8)|l;
        text+=String.fromCharCode(code<0x1f00?code+0x8140:code+0xc140);
        bitsRead+=13;
      }
      break;
    }
  }
  return {text,bitsRead};
}

export function decodeMessage(dataBytes: number[], version: number): {text:string;segments:any[]} {
  const bits: Bits=[];
  for (const b of dataBytes) for (let i=7;i>=0;i--) bits.push((b>>i)&1);
  const segments: any[]=[];
  let text="",offset=0;
  while(offset<bits.length){
    const mr=readModeIndicator(bits,offset); if(!mr) break;
    offset+=mr.bitsRead;
    const {count,bitsRead:ccb}=readCharacterCount(bits,offset,mr.mode,version);
    offset+=ccb;
    const {text:t,bitsRead:pb}=extractPayload(bits,mr.mode,count,offset);
    offset+=pb;
    segments.push({mode:mr.mode,text:t});
    text+=t;
  }
  return {text,segments};
}