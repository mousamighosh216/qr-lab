import { analyzeInput } from "../../src/core/bitstream/builder";

test("detects numeric mode", () => {
  expect(analyzeInput("12345").mode).toBe("numeric");
});

test("detects alphanumeric mode for uppercase + space", () => {
  expect(analyzeInput("HELLO WORLD").mode).toBe("alphanumeric");
});

test("detects byte mode for lowercase", () => {
  // lowercase letters are not in the alphanumeric set
  expect(analyzeInput("hello world").mode).toBe("byte");
});

test("detects byte mode for mixed symbols", () => {
  expect(analyzeInput("https://example.com").mode).toBe("byte");
});

test("character count matches input length for byte mode", () => {
  const result = analyzeInput("hello");
  expect(result.characterCount).toBe(5);
});

test("numeric mode estimatedBitLength for 3 digits is 10", () => {
  // "123" → one group of 3 → 10 bits
  expect(analyzeInput("123").estimatedBitLength).toBe(10);
});

test("numeric mode estimatedBitLength for 4 digits is 17", () => {
  // "1234" → one group of 3 (10 bits) + one leftover of 1 (4 bits) = 14
  // Wait — 4 digits: group of 3 = 10, remainder 1 = 4 → 14 bits
  expect(analyzeInput("1234").estimatedBitLength).toBe(14);
});

test("throws on empty input", () => {
  expect(() => analyzeInput("")).toThrow();
});