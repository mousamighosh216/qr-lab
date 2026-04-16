import {
  getVersionCapacity,
  getECBlockConfig,
  getTotalDataCodewords,
  getTotalECCodewords,
  getModuleCount,
  selectVersion,
} from "../../src/core/qr/version";

// Spot-check against known ISO values
test("V1-M byte capacity is 14", () => {
  expect(getVersionCapacity(1, "M", "byte")).toBe(14);
});

test("V1-H byte capacity is 7", () => {
  expect(getVersionCapacity(1, "H", "byte")).toBe(7);
});

test("V40-L numeric capacity is 7089", () => {
  expect(getVersionCapacity(40, "L", "numeric")).toBe(7089);
});

test("getModuleCount V1 is 21", () => {
  expect(getModuleCount(1)).toBe(21);
});

test("getModuleCount V40 is 177", () => {
  expect(getModuleCount(40)).toBe(177);
});

test("selectVersion picks V1 for short numeric at EC-L", () => {
  expect(selectVersion("numeric", "L", 10)).toBe(1);
});

test("selectVersion picks correct version for 100 byte chars at EC-M", () => {
  const v = selectVersion("byte", "M", 100);
  expect(getVersionCapacity(v, "M", "byte")).toBeGreaterThanOrEqual(100);
  expect(getVersionCapacity(v - 1, "M", "byte")).toBeLessThan(100);
});

test("selectVersion throws for input exceeding V40", () => {
  expect(() => selectVersion("byte", "H", 99999)).toThrow(RangeError);
});

test("V1-M block config is correct", () => {
  const config = getECBlockConfig(1, "M");
  expect(config).toHaveLength(1);
  expect(config[0].count).toBe(1);
  expect(config[0].dataCodewords).toBe(16);
  expect(config[0].ecCodewordsPerBlock).toBe(10);
});

test("getTotalDataCodewords V1-M is 16", () => {
  expect(getTotalDataCodewords(1, "M")).toBe(16);
});

test("getTotalECCodewords V1-M is 10", () => {
  expect(getTotalECCodewords(1, "M")).toBe(10);
});