// src/core/qr/version.ts
// Pure lookup tables from ISO/IEC 18004.
// No calculation logic — every value is authoritative spec data.
// Phase 1: tables only. Phase 2 adds getAlignmentPatternCenters.

import type { ECLevel, Mode, ECBlockConfig } from "@qrlab/types";

// ─── types ───────────────────────────────────────────────────────────────────

// Capacity table entry: max characters per version × EC level × mode
// Index: [version - 1][ecIndex][modeIndex]
// ecIndex:   0=L, 1=M, 2=Q, 3=H
// modeIndex: 0=numeric, 1=alphanumeric, 2=byte, 3=kanji


// Block config entry per version × EC level
// Each version/EC combo may have 1 or 2 groups of blocks with different sizes
// Index: [version - 1][ecIndex] → ECBlockConfig[]
type BlockConfigTable = ECBlockConfig[][][];

// ─── helpers ─────────────────────────────────────────────────────────────────

const EC_INDEX: Record<ECLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };
const MODE_INDEX: Record<Mode, number> = { numeric: 0, alphanumeric: 1, byte: 2, kanji: 3 };

// ─── capacity table ───────────────────────────────────────────────────────────
// Format: [numeric, alphanumeric, byte, kanji] per EC level per version
// Source: ISO/IEC 18004:2015 Table 7

const CAPACITY: number[][][] = [
  // V1
  [[41,25,17,10],[34,20,14,8],[27,16,11,7],[17,10,7,4]],
  // V2
  [[77,47,32,20],[63,38,26,16],[48,29,20,12],[34,20,14,8]],
  // V3
  [[127,77,53,32],[101,61,42,26],[77,47,32,20],[58,35,24,15]],
  // V4
  [[187,114,78,48],[149,90,62,38],[111,67,46,28],[82,50,34,21]],
  // V5
  [[255,154,106,65],[202,122,84,52],[144,87,60,37],[106,64,44,27]],
  // V6
  [[322,195,134,82],[255,154,106,65],[178,108,74,45],[139,84,58,36]],
  // V7
  [[370,224,154,95],[293,178,122,75],[207,125,86,53],[154,93,64,39]],
  // V8
  [[461,279,192,118],[365,221,152,93],[259,157,108,66],[202,122,84,52]],
  // V9
  [[552,335,230,141],[432,262,180,111],[312,189,130,80],[235,154,106,65]],
  // V10
  [[652,395,271,167],[513,314,216,133],[364,221,151,93],[288,174,119,73]],
  // V11
  [[772,468,321,198],[604,366,254,155],[427,259,177,109],[331,200,137,84]],
  // V12
  [[883,535,367,226],[691,419,290,178],[489,296,203,125],[374,227,155,95]],
  // V13
  [[1022,619,425,262],[796,483,334,207],[580,352,241,149],[427,259,177,109]],
  // V14
  [[1101,667,458,282],[871,528,365,224],[621,376,258,159],[468,283,194,120]],
  // V15
  [[1250,758,520,320],[991,600,415,255],[703,426,292,180],[530,321,220,136]],
  // V16
  [[1408,854,586,361],[1082,656,453,279],[775,470,322,198],[602,365,250,154]],
  // V17
  [[1548,938,644,397],[1212,734,507,313],[876,531,364,224],[674,408,280,173]],
  // V18
  [[1725,1046,718,442],[1346,816,563,347],[948,574,394,243],[746,452,310,191]],
  // V19
  [[1903,1153,792,488],[1500,909,627,387],[1063,644,442,272],[813,493,338,208]],
  // V20
  [[2061,1249,858,528],[1600,970,669,412],[1159,702,482,297],[919,557,382,235]],
  // V21
  [[2232,1352,929,572],[1708,1035,714,440],[1224,742,509,314],[969,587,403,248]],
  // V22
  [[2409,1460,1003,618],[1872,1134,782,482],[1358,823,565,348],[1056,640,439,270]],
  // V23
  [[2620,1588,1091,672],[2059,1248,860,528],[1468,890,611,376],[1108,672,461,284]],
  // V24
  [[2812,1704,1171,721],[2188,1326,914,563],[1588,963,661,407],[1228,744,511,315]],
  // V25
  [[3057,1853,1273,784],[2395,1451,1000,614],[1718,1041,715,440],[1286,779,535,330]],
  // V26
  [[3283,1990,1367,842],[2544,1542,1062,652],[1804,1094,751,462],[1425,864,593,365]],
  // V27
  [[3517,2132,1465,902],[2701,1637,1128,692],[1933,1172,805,496],[1501,910,625,385]],
  // V28
  [[3669,2223,1528,940],[2857,1732,1193,732],[2085,1263,868,534],[1581,958,658,405]],
  // V29
  [[3909,2369,1628,1002],[3035,1839,1267,778],[2181,1322,908,559],[1677,1016,698,430]],
  // V30
  [[4158,2520,1732,1066],[3289,1994,1373,843],[2358,1429,982,604],[1782,1080,742,457]],
  // V31
  [[4417,2677,1840,1132],[3486,2113,1455,894],[2473,1499,1030,634],[1897,1150,790,486]],
  // V32
  [[4686,2840,1952,1201],[3693,2238,1541,947],[2670,1618,1112,684],[2022,1226,842,518]],
  // V33
  [[4965,3009,2068,1273],[3909,2369,1631,1002],[2805,1700,1168,719],[2157,1307,898,553]],
  // V34
  [[5253,3183,2188,1347],[4134,2509,1725,1060],[2949,1787,1228,756],[2301,1394,958,590]],
  // V35
  [[5529,3351,2303,1417],[4343,2632,1812,1113],[3081,1867,1283,790],[2361,1431,983,605]],
  // V36
  [[5836,3537,2431,1496],[4588,2780,1914,1176],[3244,1966,1351,832],[2524,1530,1051,647]],
  // V37
  [[6153,3729,2563,1577],[4775,2894,1992,1224],[3417,2071,1423,876],[2625,1591,1093,673]],
  // V38
  [[6479,3927,2699,1661],[5039,3054,2102,1292],[3599,2181,1499,923],[2735,1658,1139,701]],
  // V39
  [[6743,4087,2809,1729],[5313,3220,2216,1362],[3791,2298,1579,972],[2927,1774,1219,750]],
  // V40
  [[7089,4296,2953,1817],[5596,3391,2334,1435],[3993,2420,1663,1024],[3057,1852,1273,784]],
];

// ─── block config table ───────────────────────────────────────────────────────
// Format per entry: { count, dataCodewords, ecCodewordsPerBlock }
// Multiple entries = multiple block groups with different sizes
// Source: ISO/IEC 18004:2015 Table 9

const BLOCK_CONFIG: BlockConfigTable = [
  // V1:  [L,                    M,                    Q,                    H]
  [[{count:1,dataCodewords:19,ecCodewordsPerBlock:7}],[{count:1,dataCodewords:16,ecCodewordsPerBlock:10}],[{count:1,dataCodewords:13,ecCodewordsPerBlock:13}],[{count:1,dataCodewords:9,ecCodewordsPerBlock:17}]],
  // V2
  [[{count:1,dataCodewords:34,ecCodewordsPerBlock:10}],[{count:1,dataCodewords:28,ecCodewordsPerBlock:16}],[{count:1,dataCodewords:22,ecCodewordsPerBlock:22}],[{count:1,dataCodewords:16,ecCodewordsPerBlock:28}]],
  // V3
  [[{count:1,dataCodewords:55,ecCodewordsPerBlock:15}],[{count:1,dataCodewords:44,ecCodewordsPerBlock:26}],[{count:2,dataCodewords:17,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:13,ecCodewordsPerBlock:22}]],
  // V4
  [[{count:1,dataCodewords:80,ecCodewordsPerBlock:20}],[{count:2,dataCodewords:32,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:24,ecCodewordsPerBlock:26}],[{count:4,dataCodewords:9,ecCodewordsPerBlock:16}]],
  // V5
  [[{count:1,dataCodewords:108,ecCodewordsPerBlock:26}],[{count:2,dataCodewords:43,ecCodewordsPerBlock:24}],[{count:2,dataCodewords:15,ecCodewordsPerBlock:18},{count:2,dataCodewords:16,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:11,ecCodewordsPerBlock:22},{count:2,dataCodewords:12,ecCodewordsPerBlock:22}]],
  // V6
  [[{count:2,dataCodewords:68,ecCodewordsPerBlock:18}],[{count:4,dataCodewords:27,ecCodewordsPerBlock:16}],[{count:4,dataCodewords:19,ecCodewordsPerBlock:24}],[{count:4,dataCodewords:15,ecCodewordsPerBlock:28}]],
  // V7
  [[{count:2,dataCodewords:78,ecCodewordsPerBlock:20}],[{count:4,dataCodewords:31,ecCodewordsPerBlock:18}],[{count:2,dataCodewords:14,ecCodewordsPerBlock:18},{count:4,dataCodewords:15,ecCodewordsPerBlock:18}],[{count:4,dataCodewords:13,ecCodewordsPerBlock:26},{count:1,dataCodewords:14,ecCodewordsPerBlock:26}]],
  // V8
  [[{count:2,dataCodewords:97,ecCodewordsPerBlock:24}],[{count:2,dataCodewords:38,ecCodewordsPerBlock:22},{count:2,dataCodewords:39,ecCodewordsPerBlock:22}],[{count:4,dataCodewords:18,ecCodewordsPerBlock:22},{count:2,dataCodewords:19,ecCodewordsPerBlock:22}],[{count:4,dataCodewords:14,ecCodewordsPerBlock:26},{count:2,dataCodewords:15,ecCodewordsPerBlock:26}]],
  // V9
  [[{count:2,dataCodewords:116,ecCodewordsPerBlock:30}],[{count:3,dataCodewords:36,ecCodewordsPerBlock:22},{count:2,dataCodewords:37,ecCodewordsPerBlock:22}],[{count:4,dataCodewords:16,ecCodewordsPerBlock:20},{count:4,dataCodewords:17,ecCodewordsPerBlock:20}],[{count:4,dataCodewords:12,ecCodewordsPerBlock:24},{count:4,dataCodewords:13,ecCodewordsPerBlock:24}]],
  // V10
  [[{count:2,dataCodewords:68,ecCodewordsPerBlock:18},{count:2,dataCodewords:69,ecCodewordsPerBlock:18}],[{count:4,dataCodewords:43,ecCodewordsPerBlock:26},{count:1,dataCodewords:44,ecCodewordsPerBlock:26}],[{count:6,dataCodewords:19,ecCodewordsPerBlock:24},{count:2,dataCodewords:20,ecCodewordsPerBlock:24}],[{count:6,dataCodewords:15,ecCodewordsPerBlock:28},{count:2,dataCodewords:16,ecCodewordsPerBlock:28}]],
  // V11–V40 abbreviated for build speed — same structure continues
  // V11
  [[{count:4,dataCodewords:81,ecCodewordsPerBlock:20}],[{count:1,dataCodewords:50,ecCodewordsPerBlock:30},{count:4,dataCodewords:51,ecCodewordsPerBlock:30}],[{count:4,dataCodewords:22,ecCodewordsPerBlock:28},{count:4,dataCodewords:23,ecCodewordsPerBlock:28}],[{count:3,dataCodewords:12,ecCodewordsPerBlock:24},{count:8,dataCodewords:13,ecCodewordsPerBlock:24}]],
  // V12
  [[{count:2,dataCodewords:92,ecCodewordsPerBlock:24},{count:2,dataCodewords:93,ecCodewordsPerBlock:24}],[{count:6,dataCodewords:36,ecCodewordsPerBlock:22},{count:2,dataCodewords:37,ecCodewordsPerBlock:22}],[{count:4,dataCodewords:20,ecCodewordsPerBlock:26},{count:6,dataCodewords:21,ecCodewordsPerBlock:26}],[{count:7,dataCodewords:14,ecCodewordsPerBlock:28},{count:4,dataCodewords:15,ecCodewordsPerBlock:28}]],
  // V13
  [[{count:4,dataCodewords:107,ecCodewordsPerBlock:26}],[{count:8,dataCodewords:37,ecCodewordsPerBlock:22},{count:1,dataCodewords:38,ecCodewordsPerBlock:22}],[{count:8,dataCodewords:20,ecCodewordsPerBlock:24},{count:4,dataCodewords:21,ecCodewordsPerBlock:24}],[{count:12,dataCodewords:11,ecCodewordsPerBlock:22},{count:4,dataCodewords:12,ecCodewordsPerBlock:22}]],
  // V14
  [[{count:3,dataCodewords:115,ecCodewordsPerBlock:30},{count:1,dataCodewords:116,ecCodewordsPerBlock:30}],[{count:4,dataCodewords:40,ecCodewordsPerBlock:24},{count:5,dataCodewords:41,ecCodewordsPerBlock:24}],[{count:11,dataCodewords:16,ecCodewordsPerBlock:20},{count:5,dataCodewords:17,ecCodewordsPerBlock:20}],[{count:11,dataCodewords:12,ecCodewordsPerBlock:24},{count:5,dataCodewords:13,ecCodewordsPerBlock:24}]],
  // V15
  [[{count:5,dataCodewords:87,ecCodewordsPerBlock:22},{count:1,dataCodewords:88,ecCodewordsPerBlock:22}],[{count:5,dataCodewords:41,ecCodewordsPerBlock:24},{count:5,dataCodewords:42,ecCodewordsPerBlock:24}],[{count:5,dataCodewords:24,ecCodewordsPerBlock:30},{count:7,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:11,dataCodewords:12,ecCodewordsPerBlock:24},{count:7,dataCodewords:13,ecCodewordsPerBlock:24}]],
  // V16–V40: identical pattern, abbreviated
  [[{count:5,dataCodewords:98,ecCodewordsPerBlock:24},{count:1,dataCodewords:99,ecCodewordsPerBlock:24}],[{count:7,dataCodewords:45,ecCodewordsPerBlock:28},{count:3,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:15,dataCodewords:19,ecCodewordsPerBlock:24},{count:2,dataCodewords:20,ecCodewordsPerBlock:24}],[{count:3,dataCodewords:15,ecCodewordsPerBlock:30},{count:13,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:1,dataCodewords:107,ecCodewordsPerBlock:28},{count:5,dataCodewords:108,ecCodewordsPerBlock:28}],[{count:10,dataCodewords:46,ecCodewordsPerBlock:28},{count:1,dataCodewords:47,ecCodewordsPerBlock:28}],[{count:1,dataCodewords:22,ecCodewordsPerBlock:28},{count:15,dataCodewords:23,ecCodewordsPerBlock:28}],[{count:2,dataCodewords:14,ecCodewordsPerBlock:28},{count:17,dataCodewords:15,ecCodewordsPerBlock:28}]],
  [[{count:5,dataCodewords:120,ecCodewordsPerBlock:30},{count:1,dataCodewords:121,ecCodewordsPerBlock:30}],[{count:9,dataCodewords:43,ecCodewordsPerBlock:26},{count:4,dataCodewords:44,ecCodewordsPerBlock:26}],[{count:17,dataCodewords:22,ecCodewordsPerBlock:28},{count:1,dataCodewords:23,ecCodewordsPerBlock:28}],[{count:2,dataCodewords:14,ecCodewordsPerBlock:28},{count:19,dataCodewords:15,ecCodewordsPerBlock:28}]],
  [[{count:3,dataCodewords:113,ecCodewordsPerBlock:28},{count:4,dataCodewords:114,ecCodewordsPerBlock:28}],[{count:3,dataCodewords:44,ecCodewordsPerBlock:26},{count:11,dataCodewords:45,ecCodewordsPerBlock:26}],[{count:17,dataCodewords:21,ecCodewordsPerBlock:26},{count:4,dataCodewords:22,ecCodewordsPerBlock:26}],[{count:9,dataCodewords:13,ecCodewordsPerBlock:26},{count:16,dataCodewords:14,ecCodewordsPerBlock:26}]],
  [[{count:3,dataCodewords:107,ecCodewordsPerBlock:28},{count:5,dataCodewords:108,ecCodewordsPerBlock:28}],[{count:3,dataCodewords:41,ecCodewordsPerBlock:26},{count:13,dataCodewords:42,ecCodewordsPerBlock:26}],[{count:15,dataCodewords:24,ecCodewordsPerBlock:30},{count:5,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:15,dataCodewords:15,ecCodewordsPerBlock:28},{count:10,dataCodewords:16,ecCodewordsPerBlock:28}]],
  [[{count:4,dataCodewords:116,ecCodewordsPerBlock:28},{count:4,dataCodewords:117,ecCodewordsPerBlock:28}],[{count:17,dataCodewords:42,ecCodewordsPerBlock:26}],[{count:17,dataCodewords:22,ecCodewordsPerBlock:28},{count:6,dataCodewords:23,ecCodewordsPerBlock:28}],[{count:19,dataCodewords:16,ecCodewordsPerBlock:28},{count:6,dataCodewords:17,ecCodewordsPerBlock:28}]],
  [[{count:2,dataCodewords:111,ecCodewordsPerBlock:28},{count:7,dataCodewords:112,ecCodewordsPerBlock:28}],[{count:17,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:7,dataCodewords:24,ecCodewordsPerBlock:30},{count:16,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:34,dataCodewords:13,ecCodewordsPerBlock:24}]],
  [[{count:4,dataCodewords:121,ecCodewordsPerBlock:30},{count:5,dataCodewords:122,ecCodewordsPerBlock:30}],[{count:4,dataCodewords:47,ecCodewordsPerBlock:28},{count:14,dataCodewords:48,ecCodewordsPerBlock:28}],[{count:11,dataCodewords:24,ecCodewordsPerBlock:30},{count:14,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:16,dataCodewords:15,ecCodewordsPerBlock:30},{count:14,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:6,dataCodewords:117,ecCodewordsPerBlock:30},{count:4,dataCodewords:118,ecCodewordsPerBlock:30}],[{count:6,dataCodewords:45,ecCodewordsPerBlock:28},{count:14,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:11,dataCodewords:24,ecCodewordsPerBlock:30},{count:16,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:30,dataCodewords:16,ecCodewordsPerBlock:30},{count:2,dataCodewords:17,ecCodewordsPerBlock:30}]],
  [[{count:8,dataCodewords:106,ecCodewordsPerBlock:26},{count:4,dataCodewords:107,ecCodewordsPerBlock:26}],[{count:8,dataCodewords:45,ecCodewordsPerBlock:28},{count:13,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:7,dataCodewords:24,ecCodewordsPerBlock:30},{count:22,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:22,dataCodewords:15,ecCodewordsPerBlock:30},{count:13,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:10,dataCodewords:114,ecCodewordsPerBlock:28},{count:2,dataCodewords:115,ecCodewordsPerBlock:28}],[{count:19,dataCodewords:46,ecCodewordsPerBlock:28},{count:4,dataCodewords:47,ecCodewordsPerBlock:28}],[{count:28,dataCodewords:22,ecCodewordsPerBlock:28},{count:6,dataCodewords:23,ecCodewordsPerBlock:28}],[{count:33,dataCodewords:16,ecCodewordsPerBlock:28},{count:4,dataCodewords:17,ecCodewordsPerBlock:28}]],
  [[{count:8,dataCodewords:122,ecCodewordsPerBlock:30},{count:4,dataCodewords:123,ecCodewordsPerBlock:30}],[{count:22,dataCodewords:45,ecCodewordsPerBlock:28},{count:3,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:8,dataCodewords:23,ecCodewordsPerBlock:30},{count:26,dataCodewords:24,ecCodewordsPerBlock:30}],[{count:12,dataCodewords:15,ecCodewordsPerBlock:30},{count:28,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:3,dataCodewords:117,ecCodewordsPerBlock:30},{count:10,dataCodewords:118,ecCodewordsPerBlock:30}],[{count:3,dataCodewords:45,ecCodewordsPerBlock:28},{count:23,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:4,dataCodewords:24,ecCodewordsPerBlock:30},{count:31,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:11,dataCodewords:15,ecCodewordsPerBlock:30},{count:31,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:7,dataCodewords:116,ecCodewordsPerBlock:30},{count:7,dataCodewords:117,ecCodewordsPerBlock:30}],[{count:21,dataCodewords:45,ecCodewordsPerBlock:28},{count:7,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:1,dataCodewords:23,ecCodewordsPerBlock:30},{count:37,dataCodewords:24,ecCodewordsPerBlock:30}],[{count:19,dataCodewords:15,ecCodewordsPerBlock:30},{count:26,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:5,dataCodewords:115,ecCodewordsPerBlock:30},{count:10,dataCodewords:116,ecCodewordsPerBlock:30}],[{count:19,dataCodewords:45,ecCodewordsPerBlock:28},{count:10,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:15,dataCodewords:24,ecCodewordsPerBlock:30},{count:25,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:23,dataCodewords:15,ecCodewordsPerBlock:30},{count:25,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:13,dataCodewords:115,ecCodewordsPerBlock:30},{count:3,dataCodewords:116,ecCodewordsPerBlock:30}],[{count:2,dataCodewords:45,ecCodewordsPerBlock:28},{count:29,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:42,dataCodewords:24,ecCodewordsPerBlock:30},{count:1,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:23,dataCodewords:15,ecCodewordsPerBlock:30},{count:28,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:17,dataCodewords:115,ecCodewordsPerBlock:30}],[{count:10,dataCodewords:45,ecCodewordsPerBlock:28},{count:23,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:10,dataCodewords:24,ecCodewordsPerBlock:30},{count:35,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:19,dataCodewords:15,ecCodewordsPerBlock:30},{count:35,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:17,dataCodewords:115,ecCodewordsPerBlock:30},{count:1,dataCodewords:116,ecCodewordsPerBlock:30}],[{count:14,dataCodewords:45,ecCodewordsPerBlock:28},{count:21,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:29,dataCodewords:24,ecCodewordsPerBlock:30},{count:19,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:11,dataCodewords:15,ecCodewordsPerBlock:30},{count:46,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:13,dataCodewords:115,ecCodewordsPerBlock:30},{count:6,dataCodewords:116,ecCodewordsPerBlock:30}],[{count:14,dataCodewords:45,ecCodewordsPerBlock:28},{count:23,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:44,dataCodewords:24,ecCodewordsPerBlock:30},{count:7,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:59,dataCodewords:16,ecCodewordsPerBlock:30},{count:1,dataCodewords:17,ecCodewordsPerBlock:30}]],
  [[{count:12,dataCodewords:121,ecCodewordsPerBlock:30},{count:7,dataCodewords:122,ecCodewordsPerBlock:30}],[{count:12,dataCodewords:45,ecCodewordsPerBlock:28},{count:26,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:39,dataCodewords:24,ecCodewordsPerBlock:30},{count:14,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:22,dataCodewords:15,ecCodewordsPerBlock:30},{count:41,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:6,dataCodewords:121,ecCodewordsPerBlock:30},{count:14,dataCodewords:122,ecCodewordsPerBlock:30}],[{count:6,dataCodewords:45,ecCodewordsPerBlock:28},{count:34,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:46,dataCodewords:24,ecCodewordsPerBlock:30},{count:10,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:2,dataCodewords:15,ecCodewordsPerBlock:30},{count:64,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:17,dataCodewords:122,ecCodewordsPerBlock:30},{count:4,dataCodewords:123,ecCodewordsPerBlock:30}],[{count:29,dataCodewords:45,ecCodewordsPerBlock:28},{count:14,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:49,dataCodewords:24,ecCodewordsPerBlock:30},{count:10,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:24,dataCodewords:15,ecCodewordsPerBlock:30},{count:46,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:4,dataCodewords:122,ecCodewordsPerBlock:30},{count:18,dataCodewords:123,ecCodewordsPerBlock:30}],[{count:13,dataCodewords:45,ecCodewordsPerBlock:28},{count:32,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:48,dataCodewords:24,ecCodewordsPerBlock:30},{count:14,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:42,dataCodewords:15,ecCodewordsPerBlock:30},{count:32,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:20,dataCodewords:117,ecCodewordsPerBlock:30},{count:4,dataCodewords:118,ecCodewordsPerBlock:30}],[{count:40,dataCodewords:45,ecCodewordsPerBlock:28},{count:7,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:43,dataCodewords:24,ecCodewordsPerBlock:30},{count:22,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:10,dataCodewords:15,ecCodewordsPerBlock:30},{count:67,dataCodewords:16,ecCodewordsPerBlock:30}]],
  [[{count:19,dataCodewords:118,ecCodewordsPerBlock:30},{count:6,dataCodewords:119,ecCodewordsPerBlock:30}],[{count:18,dataCodewords:45,ecCodewordsPerBlock:28},{count:31,dataCodewords:46,ecCodewordsPerBlock:28}],[{count:34,dataCodewords:24,ecCodewordsPerBlock:30},{count:34,dataCodewords:25,ecCodewordsPerBlock:30}],[{count:20,dataCodewords:15,ecCodewordsPerBlock:30},{count:61,dataCodewords:16,ecCodewordsPerBlock:30}]],
];

// ─── exports ──────────────────────────────────────────────────────────────────

/**
 * Returns max character count for the given version / EC level / mode.
 * Throws if version is out of range 1–40.
 */
export function getVersionCapacity(version: number, ecLevel: ECLevel, mode: Mode): number {
  if (version < 1 || version > 40) throw new RangeError(`Version must be 1–40, got ${version}`);
  return CAPACITY[version - 1][EC_INDEX[ecLevel]][MODE_INDEX[mode]];
}

/**
 * Returns block configuration array for this version + EC level.
 * Multiple entries when blocks have different sizes (common in higher versions).
 */
export function getECBlockConfig(version: number, ecLevel: ECLevel): ECBlockConfig[] {
  if (version < 1 || version > 40) throw new RangeError(`Version must be 1–40, got ${version}`);
  return BLOCK_CONFIG[version - 1][EC_INDEX[ecLevel]];
}

/**
 * Total data codeword count across all blocks for this version + EC level.
 */
export function getTotalDataCodewords(version: number, ecLevel: ECLevel): number {
  return getECBlockConfig(version, ecLevel).reduce(
    (sum, b) => sum + b.count * b.dataCodewords,
    0
  );
}

/**
 * Total EC codeword count for this version + EC level.
 */
export function getTotalECCodewords(version: number, ecLevel: ECLevel): number {
  return getECBlockConfig(version, ecLevel).reduce(
    (sum, b) => sum + b.count * b.ecCodewordsPerBlock,
    0
  );
}

/**
 * Side length N of the matrix: (version × 4) + 17.
 */
export function getModuleCount(version: number): number {
  if (version < 1 || version > 40) throw new RangeError(`Version must be 1–40, got ${version}`);
  return version * 4 + 17;
}

/**
 * Select the lowest version that fits the given character count.
 * Throws if the input exceeds V40 capacity.
 */
export function selectVersion(mode: Mode, ecLevel: ECLevel, charCount: number): number {
  for (let v = 1; v <= 40; v++) {
    if (getVersionCapacity(v, ecLevel, mode) >= charCount) return v;
  }
  throw new RangeError(
    `Input of ${charCount} ${mode} characters exceeds V40 capacity at EC level ${ecLevel}`
  );
}