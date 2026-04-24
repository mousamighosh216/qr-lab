// src/api/routes/generate.ts — Phase 3 (full RS pipeline)
import { Router,Request,Response,NextFunction } from "express";
import type { GenerateQRResult, ECLevel } from "@qrlab/types";
import { analyzeInput,buildBitstream } from "../../core/bitstream/builder";
import { pad,bitsToCodewords } from "../../core/bitstream/padder";
import { selectVersion,getVersionCapacity,getECBlockConfig } from "../../core/qr/version";
import { createMatrix } from "../../core/qr/matrix";
import { placeFinderPatterns,placeSeparators,placeTimingPatterns,placeAlignmentPatterns,placeDarkModule,reserveFormatRegions,reserveVersionRegions,placeDataModules } from "../../core/qr/placement";
import { selectBestMask } from "../../core/qr/mask";
import { encodeFormatString,writeFormatInfo,encodeVersionString,writeVersionInfo } from "../../core/qr/format";
import { encodeBlock,interleaveBlocks } from "../../core/errorCorrection/reedSolomon";
import { validateGenerateRequest,validateCapacityRequest,ApiError } from "../middleware/validate";
import { matrixToSVG } from "../../utils/matrixUtils";

export const generateRouter=Router();

function runPipeline(input:string,ecLevel:ECLevel,versionOverride?:number):GenerateQRResult{
  const a=analyzeInput(input);
  const version=versionOverride??selectVersion(a.mode,ecLevel,a.characterCount);
  if(a.characterCount>getVersionCapacity(version,ecLevel,a.mode)) throw new ApiError(422,`Input exceeds V${version}-${ecLevel} capacity`);
  const padded=pad(buildBitstream(input,version),version,ecLevel);
  const data=bitsToCodewords(padded);
  const config=getECBlockConfig(version,ecLevel);
  const encoded: ReturnType<typeof encodeBlock>[]=[];
  const ecCW: number[]=[];
  let offset=0;
  for(const {count,dataCodewords:len,ecCodewordsPerBlock:ec} of config) for(let i=0;i<count;i++){const eb=encodeBlock(data.slice(offset,offset+len),ec);encoded.push(eb);ecCW.push(...eb.ec);offset+=len;}
  const interleaved=interleaveBlocks(encoded);
  const bits=interleaved.flatMap(b=>{const out:number[]=[];for(let i=7;i>=0;i--)out.push((b>>i)&1);return out;});
  const matrix=createMatrix(version);
  placeFinderPatterns(matrix);placeSeparators(matrix);placeTimingPatterns(matrix);placeAlignmentPatterns(matrix,version);placeDarkModule(matrix,version);reserveFormatRegions(matrix);reserveVersionRegions(matrix,version);placeDataModules(matrix,bits);
  const {maskId,maskedMatrix}=selectBestMask(matrix);
  writeFormatInfo(maskedMatrix,encodeFormatString(ecLevel,maskId));
  if(version>=7) writeVersionInfo(maskedMatrix,encodeVersionString(version),version);
  return {matrix:maskedMatrix,version,ecLevel,mode:a.mode,bitstream:[...bits],dataCodewords:data,ecCodewords:ecCW,blockConfig:config,svgPreview:matrixToSVG(maskedMatrix)};
}

generateRouter.post("/",(req:Request,res:Response,next:NextFunction)=>{try{validateGenerateRequest(req);const{input,ecLevel,version}=req.body as{input:string;ecLevel:ECLevel;version?:number};res.json(runPipeline(input,ecLevel,version));}catch(err){next(err);}});
generateRouter.get("/capacity",(req:Request,res:Response,next:NextFunction)=>{try{validateCapacityRequest(req);res.json({capacity:getVersionCapacity(Number(req.query.version),req.query.ecLevel as ECLevel,req.query.mode as any)});}catch(err){next(err);}});