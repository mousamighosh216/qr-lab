// src/services/regionLabels.ts
// Frontend-side region label logic — mirrors backend matrixUtils.ts.

export type RegionLabel =
  | "finder" | "separator" | "timing" | "alignment"
  | "format" | "version"  | "dark"   | "data" | "unknown";

const ALIGNMENT_CENTERS: number[][] = [
  [],          // V1
  [6,18],[6,22],[6,26],[6,30],[6,34],
  [6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],
  [6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],
  [6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],
  [6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],
  [6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],
  [6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],
  [6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],
  [6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],
  [6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],
  [6,30,58,86,114,142,170],
];

export function getModuleRegionLabel(row: number, col: number, version: number): RegionLabel {
  const n = version * 4 + 17;

  if ((row < 7 && col < 7) || (row < 7 && col >= n-7) || (row >= n-7 && col < 7))
    return "finder";

  if (
    (row === 7 && col <= 7) || (col === 7 && row <= 7) ||
    (row === 7 && col >= n-8) || (row <= 7 && col === n-8) ||
    (row >= n-8 && col === 7) || (row === n-8 && col <= 7)
  ) return "separator";

  if (row === 6 || col === 6) return "timing";
  if (row === 4 * version + 9 && col === 8) return "dark";

  if ((row === 8 && col <= 8) || (col === 8 && row <= 8)) return "format";
  if (row === 8 && col >= n-8) return "format";
  if (col === 8 && row >= n-7) return "format";

  if (version >= 7) {
    if (row < 6 && col >= n-11 && col < n-8) return "version";
    if (row >= n-11 && row < n-8 && col < 6)  return "version";
  }

  const centers = ALIGNMENT_CENTERS[version - 1] ?? [];
  for (const r of centers) {
    for (const c of centers) {
      if (Math.abs(row - r) <= 2 && Math.abs(col - c) <= 2) return "alignment";
    }
  }

  return "data";
}