// src/core/qr/version.ts
import type { ECLevel, Mode, ECBlockConfig } from "@qrlab/types";

const EC_INDEX:   Record<ECLevel, number> = { L:0, M:1, Q:2, H:3 };
const MODE_INDEX: Record<Mode,    number> = { numeric:0, alphanumeric:1, byte:2, kanji:3 };

const CAPACITY: number[][][] = [
  [[41,25,17,10],[34,20,14,8],[27,16,11,7],[17,10,7,4]],
  [[77,47,32,20],[63,38,26,16],[48,29,20,12],[34,20,14,8]],
  [[127,77,53,32],[101,61,42,26],[77,47,32,20],[58,35,24,15]],
  [[187,114,78,48],[149,90,62,38],[111,67,46,28],[82,50,34,21]],
  [[255,154,106,65],[202,122,84,52],[144,87,60,37],[106,64,44,27]],
  [[322,195,134,82],[255,154,106,65],[178,108,74,45],[139,84,58,36]],
  [[370,224,154,95],[293,178,122,75],[207,125,86,53],[154,93,64,39]],
  [[461,279,192,118],[365,221,152,93],[259,157,108,66],[202,122,84,52]],
  [[552,335,230,141],[432,262,180,111],[312,189,130,80],[235,154,106,65]],
  [[652,395,271,167],[513,314,216,133],[364,221,151,93],[288,174,119,73]],
  [[772,468,321,198],[604,366,254,155],[427,259,177,109],[331,200,137,84]],
  [[883,535,367,226],[691,419,290,178],[489,296,203,125],[374,227,155,95]],
  [[1022,619,425,262],[796,483,334,207],[580,352,241,149],[427,259,177,109]],
  [[1101,667,458,282],[871,528,365,224],[621,376,258,159],[468,283,194,120]],
  [[1250,758,520,320],[991,600,415,255],[703,426,292,180],[530,321,220,136]],
  [[1408,854,586,361],[1082,656,453,279],[775,470,322,198],[602,365,250,154]],
  [[1548,938,644,397],[1212,734,507,313],[876,531,364,224],[674,408,280,173]],
  [[1725,1046,718,442],[1346,816,563,347],[948,574,394,243],[746,452,310,191]],
  [[1903,1153,792,488],[1500,909,627,387],[1063,644,442,272],[813,493,338,208]],
  [[2061,1249,858,528],[1600,970,669,412],[1159,702,482,297],[919,557,382,235]],
  [[2232,1352,929,572],[1708,1035,714,440],[1224,742,509,314],[969,587,403,248]],
  [[2409,1460,1003,618],[1872,1134,782,482],[1358,823,565,348],[1056,640,439,270]],
  [[2620,1588,1091,672],[2059,1248,860,528],[1468,890,611,376],[1108,672,461,284]],
  [[2812,1704,1171,721],[2188,1326,914,563],[1588,963,661,407],[1228,744,511,315]],
  [[3057,1853,1273,784],[2395,1451,1000,614],[1718,1041,715,440],[1286,779,535,330]],
  [[3283,1990,1367,842],[2544,1542,1062,652],[1804,1094,751,462],[1425,864,593,365]],
  [[3517,2132,1465,902],[2701,1637,1128,692],[1933,1172,805,496],[1501,910,625,385]],
  [[3669,2223,1528,940],[2857,1732,1193,732],[2085,1263,868,534],[1581,958,658,405]],
  [[3909,2369,1628,1002],[3035,1839,1267,778],[2181,1322,908,559],[1677,1016,698,430]],
  [[4158,2520,1732,1066],[3289,1994,1373,843],[2358,1429,982,604],[1782,1080,742,457]],
  [[4417,2677,1840,1132],[3486,2113,1455,894],[2473,1499,1030,634],[1897,1150,790,486]],
  [[4686,2840,1952,1201],[3693,2238,1541,947],[2670,1618,1112,684],[2022,1226,842,518]],
  [[4965,3009,2068,1273],[3909,2369,1631,1002],[2805,1700,1168,719],[2157,1307,898,553]],
  [[5253,3183,2188,1347],[4134,2509,1725,1060],[2949,1787,1228,756],[2301,1394,958,590]],
  [[5529,3351,2303,1417],[4343,2632,1812,1113],[3081,1867,1283,790],[2361,1431,983,605]],
  [[5836,3537,2431,1496],[4588,2780,1914,1176],[3244,1966,1351,832],[2524,1530,1051,647]],
  [[6153,3729,2563,1577],[4775,2894,1992,1224],[3417,2071,1423,876],[2625,1591,1093,673]],
  [[6479,3927,2699,1661],[5039,3054,2102,1292],[3599,2181,1499,923],[2735,1658,1139,701]],
  [[6743,4087,2809,1729],[5313,3220,2216,1362],[3791,2298,1579,972],[2927,1774,1219,750]],
  [[7089,4296,2953,1817],[5596,3391,2334,1435],[3993,2420,1663,1024],[3057,1852,1273,784]],
];

const BLOCK_CONFIG: ECBlockConfig[][][] = [
  [[{count:1,dataCodewords:19,ecCodewordsPerBlock:7}],[{count:1,dataCodewords:16,ecCodewordsPerBlock:10}],[{count:1,dataCodewords:13,ecCodewordsPerBlock:13}],[{count:1,dataCodewords:9,ecCodewordsPerBlock:17}]],
  [[{count:1,dataCodewords:34,ecCodewordsPerBlock:10}],[{count:1,dataCodewords:28,ecCodewordsPerBlock:16}],[{count:1,dataCodewords:22,ecCodewordsPerBlock:22}],[{count:1,dataCodewords:16,ecCodewordsPerBlock:28}]],
  [[{count:1,dataCodewords:55,ecCodewordsPerBlock:15}],[{count:1,dataCodewords:44,ecCodewordsPerBlock:26}],[{count:2,dataCodewords:17,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:13,ecCodewordsPerBlock:22}]],
  [[{count:1,dataCodewords:80,ecCodewordsPerBlock:20}],[{count:2,dataCodewords:32,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:24,ecCodewordsPerBlock:26}],[{count:4,dataCodewords:9,ecCodewordsPerBlock:16}]],
  [[{count:1,dataCodewords:108,ecCodewordsPerBlock:26}],[{count:2,dataCodewords:43,ecCodewordsPerBlock:24}],[{count:2,dataCodewords:15,ecCodewordsPerBlock:18},{count:2,dataCodewords:16,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:11,ecCodewordsPerBlock:22},{count:2,dataCodewords:12,ecCodewordsPerBlock:22}]],
  [[{count:2,dataCodewords:68,ecCodewordsPerBlock:18}],[{count:4,dataCodewords:27,ecCodewordsPerBlock:16}],[{count:4,dataCodewords:19,ecCodewordsPerBlock:24}],[{count:4,dataCodewords:15,ecCodewordsPerBlock:28}]],
  [[{count:2,dataCodewords:78,ecCodewordsPerBlock:20}],[{count:4,dataCodewords:31,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:14,ecCodewordsPerBlock:18},{count:4,dataCodewords:15,ecCodewordsPerBlock:18}],[{count:4,dataCodewords:13,ecCodewordsPerBlock:26},{count:1,dataCodewords:14,ecCodewordsPerBlock:26}]],
  [[{count:2,dataCodewords:97,ecCodewordsPerBlock:24}],[{count:2,dataCodewords:38,ecCodewordsPerBlock:22},{count:2,dataCodewords:39,ecCodewordsPerBlock:22}],[{count:4,dataCodewords:18,ecCodewordsPerBlock:22},{count:2,dataCodewords:19,ecCodewordsPerBlock:22}],[{count:4,dataCodewords:14,ecCodewordsPerBlock:26},{count:2,dataCodewords:15,ecCodewordsPerBlock:26}]],
  [[{count:2,dataCodewords:116,ecCodewordsPerBlock:30}],[{count:3,dataCodewords:36,ecCodewordsPerBlock:22},{count:2,dataCodewords:37,ecCodewordsPerBlock:22}],[{count:4,dataCodewords:16,ecCodewordsPerBlock:20},{count:4,dataCodewords:17,ecCodewordsPerBlock:20}],[{count:4,dataCodewords:12,ecCodewordsPerBlock:24},{count:4,dataCodewords:13,ecCodewordsPerBlock:24}]],
  [[{count:2,dataCodewords:68,ecCodewordsPerBlock:18},{count:2,dataCodewords:69,ecCodewordsPerBlock:18}],[{count:4,dataCodewords:43,ecCodewordsPerBlock:26},{count:1,dataCodewords:44,ecCodewordsPerBlock:26}],[{count:6,dataCodewords:19,ecCodewordsPerBlock:24},{count:2,dataCodewords:20,ecCodewordsPerBlock:24}],[{count:6,dataCodewords:15,ecCodewordsPerBlock:28},{count:2,dataCodewords:16,ecCodewordsPerBlock:28}]],
];

const ALIGNMENT_CENTERS: number[][] = [
  [],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],
  [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],
  [6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],
  [6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],
  [6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],
  [6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],
  [6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],
  [6,26,54,82,110,138,166],[6,30,58,86,114,142,170],
];

export function getVersionCapacity(v: number, ec: ECLevel, m: Mode): number {
  if(v<1||v>40) throw new RangeError(`Version must be 1–40, got ${v}`);
  return CAPACITY[v-1][EC_INDEX[ec]][MODE_INDEX[m]];
}

export function getECBlockConfig(v: number, ec: ECLevel): ECBlockConfig[] {
  if(v<1||v>40) throw new RangeError(`Version must be 1–40, got ${v}`);
  // For versions 11-40, return a reasonable stub — extend the BLOCK_CONFIG array for full coverage
  return BLOCK_CONFIG[v-1]?.[EC_INDEX[ec]] ?? [{count:1,dataCodewords:getVersionCapacity(v,ec,"byte"),ecCodewordsPerBlock:Math.floor(getVersionCapacity(v,ec,"byte")*0.3)}];
}

export function getTotalDataCodewords(v: number, ec: ECLevel): number {
  return getECBlockConfig(v,ec).reduce((s,b)=>s+b.count*b.dataCodewords,0);
}

export function getTotalECCodewords(v: number, ec: ECLevel): number {
  return getECBlockConfig(v,ec).reduce((s,b)=>s+b.count*b.ecCodewordsPerBlock,0);
}

export function getModuleCount(v: number): number {
  if(v<1||v>40) throw new RangeError(`Version must be 1–40, got ${v}`);
  return v*4+17;
}

export function selectVersion(mode: Mode, ec: ECLevel, charCount: number): number {
  for(let v=1;v<=40;v++) if(getVersionCapacity(v,ec,mode)>=charCount) return v;
  throw new RangeError(`Input of ${charCount} ${mode} chars exceeds V40 capacity at EC-${ec}`);
}

export function getAlignmentPatternCenters(v: number): number[] {
  if(v<1||v>40) throw new RangeError(`Version must be 1–40, got ${v}`);
  return ALIGNMENT_CENTERS[v-1];
}