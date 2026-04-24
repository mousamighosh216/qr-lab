// tests/core/modeEncoder.test.ts

import {
  encodeNumeric,
  encodeAlphanumeric,
  encodeByte,
  getAlphanumericValue,
  encodeData,
} from "../../src/core/bitstream/modeEncoder";

// ─── numeric ──────────────────────────────────────────────────────────────────

describe("encodeNumeric", () => {
  test("group of 3 digits → 10 bits", () => {
    const bits = encodeNumeric("012");
    expect(bits).toHaveLength(10);
    // 012 = 12 decimal = 0000001100
    expect(bits).toEqual([0,0,0,0,0,0,1,1,0,0]);
  });

  test("group of 2 digits → 7 bits", () => {
    const bits = encodeNumeric("34");
    expect(bits).toHaveLength(7);
    // 34 decimal = 0100010
    expect(bits).toEqual([0,1,0,0,0,1,0]);
  });

  test("single digit → 4 bits", () => {
    const bits = encodeNumeric("5");
    expect(bits).toHaveLength(4);
    // 5 decimal = 0101
    expect(bits).toEqual([0,1,0,1]);
  });

  test("4 digits = group of 3 + single", () => {
    expect(encodeNumeric("1234")).toHaveLength(14); // 10 + 4
  });

  test("6 digits = two groups of 3", () => {
    expect(encodeNumeric("123456")).toHaveLength(20); // 10 + 10
  });

  test("999 → maximum 10-bit value", () => {
    const bits = encodeNumeric("999");
    expect(bits).toEqual([1,1,1,1,1,0,0,1,1,1]); // 999 = 0b1111100111
  });
});

// ─── alphanumeric ─────────────────────────────────────────────────────────────

describe("encodeAlphanumeric", () => {
  test("pair of chars → 11 bits", () => {
    const bits = encodeAlphanumeric("AC");
    // A=10, C=12 → 10*45+12 = 462 = 0b00111001110
    expect(bits).toHaveLength(11);
    expect(bits).toEqual([0,0,1,1,1,0,0,1,1,1,0]);
  });

  test("single trailing char → 6 bits", () => {
    const bits = encodeAlphanumeric("A");
    // A=10 = 001010
    expect(bits).toHaveLength(6);
    expect(bits).toEqual([0,0,1,0,1,0]);
  });

  test("HELLO WORLD produces correct length", () => {
    // 11 chars → 5 pairs (55 bits) + 1 single (6 bits) = 61 bits
    expect(encodeAlphanumeric("HELLO WORLD")).toHaveLength(61);
  });

  test("throws on lowercase", () => {
    expect(() => encodeAlphanumeric("hello")).toThrow();
  });
});

// ─── getAlphanumericValue ────────────────────────────────────────────────────

describe("getAlphanumericValue", () => {
  test("digits 0–9 map to 0–9", () => {
    expect(getAlphanumericValue("0")).toBe(0);
    expect(getAlphanumericValue("9")).toBe(9);
  });

  test("A maps to 10", () => {
    expect(getAlphanumericValue("A")).toBe(10);
  });

  test("Z maps to 35", () => {
    expect(getAlphanumericValue("Z")).toBe(35);
  });

  test("space maps to 36", () => {
    expect(getAlphanumericValue(" ")).toBe(36);
  });

  test("throws on invalid char", () => {
    expect(() => getAlphanumericValue("@")).toThrow();
    expect(() => getAlphanumericValue("a")).toThrow();
  });
});

// ─── encodeByte ───────────────────────────────────────────────────────────────

describe("encodeByte", () => {
  test("ASCII char → 8 bits", () => {
    const bits = encodeByte("A");
    expect(bits).toHaveLength(8);
    // 'A' = 65 = 01000001
    expect(bits).toEqual([0,1,0,0,0,0,0,1]);
  });

  test("two ASCII chars → 16 bits", () => {
    expect(encodeByte("AB")).toHaveLength(16);
  });

  test("bit values are 0 or 1 only", () => {
    const bits = encodeByte("Hello, World!");
    expect(bits.every((b) => b === 0 || b === 1)).toBe(true);
  });
});

// ─── encodeData dispatcher ────────────────────────────────────────────────────

describe("encodeData", () => {
  test("dispatches numeric mode", () => {
    expect(encodeData("123", "numeric")).toEqual(encodeNumeric("123"));
  });

  test("dispatches alphanumeric mode", () => {
    expect(encodeData("AB", "alphanumeric")).toEqual(encodeAlphanumeric("AB"));
  });

  test("dispatches byte mode", () => {
    expect(encodeData("hi", "byte")).toEqual(encodeByte("hi"));
  });
});