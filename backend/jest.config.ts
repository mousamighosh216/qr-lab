import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleNameMapper: { "^@qrlab/types$": "<rootDir>/../packages/types/src/index.ts" },
  transform: {
    "^.+\\.tsx?$": ["ts-jest",{tsconfig:{paths:{"@qrlab/types":["../packages/types/src/index.ts"]}}}],
  },
};
export default config;
 