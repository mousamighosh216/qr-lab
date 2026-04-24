// tests/core/padder.test.ts

import { appendTerminator, byteAlign, appendFillBytes, pad, bitsToCodewords, getDataCodewordCapacity } from "../../src/core/bitstream/padder";
import type { Bits } from "@qrlab/types";

describe("appendTerminator", () => {
  test("appends up to 4 zeros", () => {
    const bits: Bits = [1, 0, 1];
    const result = appendTerminator(bits, 100);
    expect(result).toEqual([1, 0, 1, 0, 0, 0, 0]);
  });

  test("stops early if capacity reached", () => {
    const bits: Bits = [1, 0, 1];
    const result = appendTerminator(bits, 4); // only 1 slot left
    expect(result).toHaveLength(4);
  });
});

describe("byteAlign", () => {
  test("pads to multiple of 8", () => {
    const bits: Bits = [1, 0, 1, 0, 1]; // 5 bits
    const result = byteAlign(bits);
    expect(result.length % 8).toBe(0);
    expect(result.length).toBe(8);
  });

  test("no-op when already byte-aligned", () => {
    const bits: Bits = Array(16).fill(0);
    expect(byteAlign(bits)).toHaveLength(16);
  });
});

describe("appendFillBytes", () => {
  test("fills with alternating 0xEC/0x11", () => {
    const bits: Bits = [];
    const result = appendFillBytes(bits, 2);
    // 0xEC = 11101100, 0x11 = 00010001
    expect(result.slice(0, 8)).toEqual([1,1,1,0,1,1,0,0]);
    expect(result.slice(8, 16)).toEqual([0,0,0,1,0,0,0,1]);
  });

  test("result length = capacityBytes × 8", () => {
    const result = appendFillBytes([], 4);
    expect(result).toHaveLength(32);
  });
});

describe("pad", () => {
  test("output length matches capacity in bits for V1-M (16 bytes)", () => {
    const bits: Bits = Array(10).fill(1); // short input
    const result = pad(bits, 1, "M");
    expect(result).toHaveLength(getDataCodewordCapacity(1, "M") * 8);
  });

  test("all values are 0 or 1", () => {
    const result = pad([], 1, "L");
    expect(result.every((b) => b === 0 || b === 1)).toBe(true);
  });
});

describe("bitsToCodewords", () => {
  test("8 bits → 1 codeword", () => {
    // 11101100 = 0xEC = 236
    expect(bitsToCodewords([1,1,1,0,1,1,0,0])).toEqual([236]);
  });

  test("16 bits → 2 codewords", () => {
    const result = bitsToCodewords([1,1,1,0,1,1,0,0, 0,0,0,1,0,0,0,1]);
    expect(result).toEqual([236, 17]); // 0xEC, 0x11
  });

  test("throws when not byte-aligned", () => {
    expect(() => bitsToCodewords([1, 0, 1])).toThrow();
  });
});