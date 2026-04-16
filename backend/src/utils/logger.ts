// src/utils/logger.ts
// Minimal structured logger. Single function keeps call sites clean.
// Swap the implementation in Phase 4 for a real logger (pino / winston).

type LogLevel = "info" | "warn" | "error" | "debug";

export function log(level: LogLevel, message: string, data?: unknown): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined ? { data } : {}),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}