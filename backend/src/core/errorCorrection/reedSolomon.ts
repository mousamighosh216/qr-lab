// src/core/errorCorrection/reedSolomon.ts
import { add, multiply, divide, pow, inverse, LOG, ANTILOG } from "./gf256";
import { evaluatePolynomial, buildGeneratorPolynomial, polyMultiply } from "./polynomial";
import type { ECBlockConfig } from "@qrlab/types";

export interface EncodedBlock   { data: number[]; ec: number[]; }
export interface CorrectionResult { corrected: number[]; errorsFound: number; success: boolean; errorPositions?: number[]; errorMagnitudes?: number[]; failReason?: string; }
export interface DecodedBlock   { data: number[]; errorsFound: number; success: boolean; failReason?: string; }
export interface Block          { data: number[]; ec: number[]; }
export interface CorrectedBlock { blockIndex: number; data: number[]; errorsFound: number; errorsCorrected: number; errorPositions: number[]; errorMagnitudes: number[]; status: "success" | "partial" | "failed"; }
export interface CorrectionSummary { blocks: CorrectedBlock[]; totalErrors: number; totalFailures: number; success: boolean; }

// ─── encoding ─────────────────────────────────────────────────────────────────

export function generateECCodewords(dataCodewords: number[], ecCount: number): number[] {
  const gen = buildGeneratorPolynomial(ecCount);
  let rem   = [...dataCodewords, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < dataCodewords.length; i++) {
    const c = rem[i];
    if (c !== 0) for (let j = 1; j <= ecCount; j++) rem[i + j] ^= multiply(c, gen[j]);
  }
  return rem.slice(dataCodewords.length);
}

export function encodeBlock(data: number[], ecCount: number): EncodedBlock {
  return { data, ec: generateECCodewords(data, ecCount) };
}

export function interleaveBlocks(blocks: EncodedBlock[]): number[] {
  const out: number[] = [];
  const maxD = Math.max(...blocks.map(b => b.data.length));
  const maxE = Math.max(...blocks.map(b => b.ec.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  for (let i = 0; i < maxE; i++) for (const b of blocks) if (i < b.ec.length)  out.push(b.ec[i]);
  return out;
}

export function deinterleaveBlocks(interleaved: number[], config: ECBlockConfig[]): Block[] {
  const descs: {dataLen:number;ecLen:number}[] = [];
  for (const {count,dataCodewords,ecCodewordsPerBlock} of config)
    for (let i=0;i<count;i++) descs.push({dataLen:dataCodewords,ecLen:ecCodewordsPerBlock});
  const blocks: Block[] = descs.map(() => ({data:[],ec:[]}));
  let idx=0;
  const maxD=Math.max(...descs.map(d=>d.dataLen));
  for (let i=0;i<maxD;i++) for (let b=0;b<descs.length;b++) if (i<descs[b].dataLen) blocks[b].data.push(interleaved[idx++]);
  const maxE=Math.max(...descs.map(d=>d.ecLen));
  for (let i=0;i<maxE;i++) for (let b=0;b<descs.length;b++) if (i<descs[b].ecLen) blocks[b].ec.push(interleaved[idx++]);
  return blocks;
}

// ─── decoding ─────────────────────────────────────────────────────────────────

export function calculateSyndromes(received: number[], ecCount: number): number[] {
  return Array.from({length:ecCount}, (_,i) => evaluatePolynomial(received, ANTILOG[i]));
}

export function noErrors(syndromes: number[]): boolean {
  return syndromes.every(s => s === 0);
}

export function berlekampMassey(syndromes: number[]): number[] {
  const n=syndromes.length; let C=[1],B=[1],L=0,m=1,b=1;
  for (let n_=0;n_<n;n_++) {
    let d=syndromes[n_];
    for (let i=1;i<=L;i++) if (i<C.length) d^=multiply(C[i],syndromes[n_-i]);
    if (d===0) { m++; }
    else if (2*L<=n_) {
      const T=[...C],coeff=multiply(d,inverse(b));
      while(C.length<B.length+m) C.push(0);
      for(let i=0;i<B.length;i++) C[i+m]^=multiply(coeff,B[i]);
      L=n_+1-L; B=T; b=d; m=1;
    } else {
      const coeff=multiply(d,inverse(b));
      while(C.length<B.length+m) C.push(0);
      for(let i=0;i<B.length;i++) C[i+m]^=multiply(coeff,B[i]);
      m++;
    }
  }
  return C;
}

export function chienSearch(sigma: number[], n: number): number[] {
  const pos: number[] = [];
  for (let i=0;i<n;i++) {
    const x=ANTILOG[(255-i)%255];
    let v=0;
    for (let j=0;j<sigma.length;j++) v^=multiply(sigma[j],pow(x,j));
    if (v===0) pos.push(n-1-i);
  }
  return pos;
}

export function forney(syndromes: number[], sigma: number[], positions: number[], n: number): number[] {
  const ecCount=syndromes.length;
  const S=[1,...syndromes];
  const omega=polyMultiply(S,sigma).slice(0,ecCount);
  const sp: number[]=[];
  for (let i=1;i<sigma.length;i++) sp.push(i%2===1?sigma[i]:0);
  return positions.map(pos => {
    const Xk=ANTILOG[pos%255], XkInv=ANTILOG[(255-pos)%255];
    const ov=evaluatePolynomial(omega,XkInv);
    const sv=evaluatePolynomial(sp,XkInv);
    return sv===0 ? 0 : multiply(Xk,divide(ov,sv));
  });
}

export function correctErrors(received: number[], ecCount: number): CorrectionResult {
  const syn=calculateSyndromes(received,ecCount);
  if (noErrors(syn)) return {corrected:[...received],errorsFound:0,success:true};
  const sigma=berlekampMassey(syn);
  const errCount=sigma.length-1;
  if (errCount>Math.floor(ecCount/2)) return {corrected:[...received],errorsFound:errCount,success:false,failReason:`${errCount} errors exceed capacity of ${Math.floor(ecCount/2)}`};
  const positions=chienSearch(sigma,received.length);
  if (positions.length!==errCount) return {corrected:[...received],errorsFound:errCount,success:false,failReason:`Chien found ${positions.length} roots, expected ${errCount}`};
  const magnitudes=forney(syn,sigma,positions,received.length);
  const corrected=[...received];
  for (let i=0;i<positions.length;i++) corrected[positions[i]]^=magnitudes[i];
  if (!noErrors(calculateSyndromes(corrected,ecCount))) return {corrected,errorsFound:errCount,success:false,failReason:"Verification failed",errorPositions:positions,errorMagnitudes:magnitudes};
  return {corrected,errorsFound:errCount,success:true,errorPositions:positions,errorMagnitudes:magnitudes};
}

export function decodeBlock(received: number[], ecCount: number): DecodedBlock {
  const r=correctErrors(received,ecCount);
  return {data:r.corrected.slice(0,received.length-ecCount),errorsFound:r.errorsFound,success:r.success,failReason:r.failReason};
}

export function correctAllBlocks(blocks: Block[], config: ECBlockConfig[]): CorrectionSummary {
  const ecCounts: number[]=[];
  for (const {count,ecCodewordsPerBlock} of config) for (let i=0;i<count;i++) ecCounts.push(ecCodewordsPerBlock);
  const correctedBlocks: CorrectedBlock[]=[];
  let totalErrors=0,totalFailures=0;
  for (let i=0;i<blocks.length;i++) {
    const received=[...blocks[i].data,...blocks[i].ec];
    const ec=ecCounts[i]??blocks[i].ec.length;
    const r=correctErrors(received,ec);
    totalErrors+=r.errorsFound;
    if (!r.success) totalFailures++;
    correctedBlocks.push({blockIndex:i,data:r.corrected.slice(0,blocks[i].data.length),errorsFound:r.errorsFound,errorsCorrected:r.success?r.errorsFound:0,errorPositions:r.errorPositions??[],errorMagnitudes:r.errorMagnitudes??[],status:r.success?(r.errorsFound>0?"partial":"success"):"failed"});
  }
  return {blocks:correctedBlocks,totalErrors,totalFailures,success:totalFailures===0};
}

export function reconstructMessage(blocks: CorrectedBlock[]): number[] {
  return blocks.flatMap(b => b.data);
}