# QRLab — Fault-Tolerant Encoding & Recovery System

> A visual + experimental platform for fault-tolerant encoding systems built on QR codes and Reed–Solomon error correction theory.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
  - [Backend](#backend-structure)
  - [Frontend](#frontend-structure)
- [Encoding Pipeline](#encoding-pipeline)
- [Roadmap](#roadmap)
- [Research References](#research-references)

---

## Overview

QRLab is **not** a QR code generator app.

It is an **Error-Correcting System Simulator** grounded in coding theory and finite field mathematics. It lets you:

- Generate QR codes from raw input with full visibility into internal codewords and matrix structure
- Apply controlled, configurable damage to a generated QR (noise, erasure, logo embedding, burst distortion)
- Decode and attempt recovery while tracking exactly which errors were detected, corrected, or unrecoverable
- Visualize the encoding pipeline at the matrix and bit level — before damage, after damage, after recovery
- Run batch simulation experiments to detect fault-tolerance thresholds

---

## Architecture

```
Frontend (React + Canvas)
        ↓
Backend API (Node.js / FastAPI)
        ↓
Core Engine  (Encoding + Reed–Solomon + Simulation)
        ↓
Worker Queue (heavy batch simulations)
```

**Data flow through the encoding pipeline:**

```
Input Data → BitStream → Codewords → Reed–Solomon EC
           → Interleaving → QR Matrix → Damage Engine
           → Decoder → Recovered Output
```

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Frontend      | React, Canvas API, Recharts         |
| Backend       | Node.js (TypeScript) or FastAPI     |
| Core Engine   | TypeScript / Python                 |
| Math Layer    | Custom GF(256), Reed–Solomon impl.  |
| Worker Queue  | BullMQ / Celery                     |
| Testing       | Jest / Pytest                       |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/qrlab.git
cd qrlab

# Backend
cd backend
npm install
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

Environment variables: copy `.env.example` to `.env` and fill in values before running.

---

## Project Structure

---

### Backend Structure

```
backend/
│
├── src/
│   ├── core/
│   │   ├── bitstream/
│   │   │   ├── builder.ts
│   │   │   ├── padder.ts
│   │   │   └── modeEncoder.ts
│   │   │
│   │   ├── qr/
│   │   │   ├── matrix.ts
│   │   │   ├── placement.ts
│   │   │   ├── mask.ts
│   │   │   ├── format.ts
│   │   │   └── version.ts
│   │   │
│   │   └── errorCorrection/
│   │       ├── gf256.ts
│   │       ├── polynomial.ts
│   │       └── reedSolomon.ts
│   │
│   ├── simulation/
│   │   ├── damageEngine.ts
│   │   └── strategies/
│   │       ├── randomNoise.ts
│   │       ├── blockErase.ts
│   │       ├── burstDistortion.ts
│   │       └── logoEmbed.ts
│   │
│   ├── decoder/
│   │   ├── scanner.ts
│   │   ├── extractor.ts
│   │   └── corrector.ts
│   │
│   ├── analytics/
│   │   ├── thresholdDetector.ts
│   │   └── reportBuilder.ts
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── generate.ts
│   │   │   ├── damage.ts
│   │   │   ├── decode.ts
│   │   │   └── simulate.ts
│   │   └── middleware/
│   │       ├── validate.ts
│   │       └── errorHandler.ts
│   │
│   └── utils/
│       ├── binaryUtils.ts
│       ├── matrixUtils.ts
│       └── logger.ts
│
├── tests/
│   ├── core/
│   ├── simulation/
│   └── decoder/
│
├── .env.example
├── package.json
├── tsconfig.json
└── server.ts
```

---

#### `src/core/bitstream/builder.ts`

Builds the raw bitstream from input data before error correction.

```
analyzeInput(input: string): InputAnalysis
  - Scans the input and detects the optimal encoding mode
    (numeric, alphanumeric, byte, kanji)
  - Returns: { mode, characterCount, estimatedBitLength }

selectVersion(mode: Mode, ecLevel: ECLevel, charCount: number): number
  - Looks up the QR version capacity table
  - Returns the lowest version number whose capacity fits the input
  - Throws if input exceeds V40 limits

buildModeIndicator(mode: Mode): Bits
  - Returns the 4-bit mode indicator prefix for the given mode
    (0001=numeric, 0010=alphanumeric, 0100=byte, 1000=kanji)

buildCharacterCountIndicator(mode: Mode, version: number, charCount: number): Bits
  - Returns the variable-length character count field
  - Bit-length depends on mode group and version group

encodeData(input: string, mode: Mode): Bits
  - Dispatches to the correct encoding strategy (numeric/alphanumeric/byte/kanji)
  - Returns the raw encoded bits for the data body only
  - Does NOT include mode indicator or char count — builder.ts assembles them

buildBitstream(input: string, mode: Mode, version: number): Bits
  - Assembles: modeIndicator + charCountIndicator + encodedData
  - Returns the complete data bitstream before padding
```

---

#### `src/core/bitstream/padder.ts`

Pads the bitstream to exactly fill the data codeword capacity.

```
getDataCodewordCapacity(version: number, ecLevel: ECLevel): number
  - Looks up the total data codeword count for this version + EC level
  - Returns capacity in bytes

appendTerminator(bits: Bits, capacity: number): Bits
  - Appends up to 4 zero bits, stopping early if capacity is reached

byteAlign(bits: Bits): Bits
  - Pads with zero bits until length is a multiple of 8

appendFillBytes(bits: Bits, capacity: number): Bits
  - Alternates 0xEC (11101100) and 0x11 (00010001) fill bytes
  - Fills remaining data codeword slots to exactly meet capacity

pad(bits: Bits, version: number, ecLevel: ECLevel): Bits
  - Orchestrates: appendTerminator → byteAlign → appendFillBytes
  - Returns the complete padded bitstream as data codewords
```

---

#### `src/core/bitstream/modeEncoder.ts`

Implements the four QR encoding modes at the bit level.

```
encodeNumeric(input: string): Bits
  - Groups digits in threes → 10-bit values
  - Leftover pair → 7-bit value; single digit → 4-bit value

encodeAlphanumeric(input: string): Bits
  - Uses 45-character alphabet lookup table
  - Pairs: (v1 * 45 + v2) → 11-bit value
  - Single trailing char → 6-bit value

encodeByte(input: string): Bits
  - UTF-8 encodes each character to bytes
  - Each byte stored as 8 bits; no compression

encodeKanji(input: string): Bits
  - Converts to Shift-JIS byte pairs
  - Subtracts 0x8140 or 0xC140 depending on range
  - Multiplies high byte by 0xC0, adds low byte → 13-bit value

getAlphanumericValue(char: string): number
  - Returns the index of a character in the 45-char alphanumeric set
  - Throws if character is not in the set
```

---

#### `src/core/qr/matrix.ts`

Allocates and manages the QR module grid.

```
createMatrix(version: number): Matrix
  - Allocates an N×N grid where N = (version * 4) + 17
  - Initializes all modules to EMPTY state

getModuleSize(version: number): number
  - Returns the side length N of the matrix

setModule(matrix: Matrix, row: number, col: number, value: ModuleValue): void
  - Sets a module; enforces bounds checking
  - Throws on reserved-region overwrite attempts in strict mode

getModule(matrix: Matrix, row: number, col: number): ModuleValue
  - Returns the module value with bounds checking

cloneMatrix(matrix: Matrix): Matrix
  - Deep-copies a matrix (used before mask application trials)

diffMatrix(original: Matrix, damaged: Matrix): DiffResult
  - Compares two matrices module-by-module
  - Returns: { corrupted: Coord[], changed: number, percentage: number }
```

---

#### `src/core/qr/placement.ts`

Places all function patterns and data modules into the matrix.

```
placeFinderPatterns(matrix: Matrix): void
  - Draws 7×7 finder patterns at top-left, top-right, bottom-left corners
  - Each finder: 3×3 black center, white ring, black outer ring

placeSeparators(matrix: Matrix): void
  - Draws 1-module-wide white borders around each finder pattern

placeTimingPatterns(matrix: Matrix): void
  - Alternating black/white modules along row 6 and column 6
  - Starts and ends at the finder pattern borders

placeAlignmentPatterns(matrix: Matrix, version: number): void
  - Looks up alignment pattern center coordinates from version table
  - Draws 5×5 patterns (black border, white ring, black center)
  - Skips positions that overlap finder patterns or timing strips

placeDarkModule(matrix: Matrix, version: number): void
  - Forces module at (4*version + 9, 8) to BLACK

reserveFormatRegions(matrix: Matrix): void
  - Marks format information modules as RESERVED (not yet written)
  - Adjacent to all three finder patterns (two copies of format info)

reserveVersionRegions(matrix: Matrix, version: number): void
  - For version >= 7: marks version information blocks as RESERVED

placeDataModules(matrix: Matrix, bitstream: Bits): void
  - Implements zigzag column-pair sweep from bottom-right upward
  - Skips column 6 (timing strip)
  - Skips reserved and function pattern modules
  - Fills data bits in sweep order
```

---

#### `src/core/qr/mask.ts`

Applies and evaluates the eight QR mask patterns.

```
getMaskFunction(maskId: number): (row: number, col: number) => boolean
  - Returns the mask formula for one of the 8 standard masks
  - Returns true if the module at (row, col) should be flipped

applyMask(matrix: Matrix, maskId: number): Matrix
  - Clones the matrix
  - Flips every non-reserved, non-function-pattern module
    where getMaskFunction(maskId)(row, col) === true

evaluatePenalty(matrix: Matrix): number
  - Rule 1: +3 + (run-5) for each run of 5+ same-color modules in any row/col
  - Rule 2: +3 for each 2×2 block of same-color modules
  - Rule 3: +40 for each finder-like 1:1:3:1:1 pattern in row or col
  - Rule 4: ±(deviation-from-50%-dark ratio) scaled penalty
  - Returns total penalty score

selectBestMask(matrix: Matrix): { maskId: number, maskedMatrix: Matrix }
  - Tries all 8 masks using applyMask + evaluatePenalty
  - Returns the mask ID and resulting matrix with the lowest penalty score
```

---

#### `src/core/qr/format.ts`

Encodes and writes format and version information into the matrix.

```
encodeFormatString(ecLevel: ECLevel, maskId: number): Bits
  - Combines 2-bit EC level + 3-bit mask ID into 5-bit message
  - Appends 10 BCH error-correction bits (BCH(15,5), generator 10100110111)
  - XORs with fixed mask 101010000010010
  - Returns 15-bit format string

writeFormatInfo(matrix: Matrix, formatBits: Bits): void
  - Writes 15-bit format string to two reserved regions:
    adjacent to top-left finder, and split between top-right + bottom-left finders
  - Both copies are written (redundancy for scanner robustness)

encodeVersionString(version: number): Bits
  - For version >= 7: encodes 6-bit version number with 12 BCH bits
  - Returns 18-bit version string

writeVersionInfo(matrix: Matrix, versionBits: Bits, version: number): void
  - Writes 18-bit version string to two 6×3 reserved regions
  - Regions: top-right area and bottom-left area of the matrix
```

---

#### `src/core/qr/version.ts`

Version and capacity lookup tables and helper queries.

```
getVersionCapacity(version: number, ecLevel: ECLevel, mode: Mode): number
  - Returns max character count for the given version/EC/mode combination
  - Derived from the full QR ISO/IEC 18004 capacity table

getECBlockConfig(version: number, ecLevel: ECLevel): ECBlockConfig[]
  - Returns block configuration array:
    [{ count, dataCodewords, ecCodewordsPerBlock }, ...]
  - Multiple entries when blocks have different sizes (common in higher versions)

getTotalDataCodewords(version: number, ecLevel: ECLevel): number
  - Returns total data codeword count across all blocks

getTotalECCodewords(version: number, ecLevel: ECLevel): number
  - Returns total EC codeword count (data capacity drives this)

getAlignmentPatternCenters(version: number): number[]
  - Returns list of row/col coordinates for alignment pattern centers
  - Version 1 returns []

getModuleCount(version: number): number
  - Returns side length: (version * 4) + 17
```

---

#### `src/core/errorCorrection/gf256.ts`

All arithmetic in GF(2⁸) — the finite field underlying Reed–Solomon for QR.

```
add(a: number, b: number): number
  - XOR addition in GF(256): a ⊕ b (addition equals subtraction in GF(2^n))

multiply(a: number, b: number): number
  - Multiplication using log/antilog lookup tables
  - Returns 0 if either operand is 0
  - Otherwise: antilog[(log[a] + log[b]) mod 255]

divide(a: number, b: number): number
  - Division: a / b = antilog[(log[a] - log[b] + 255) mod 255]
  - Throws on division by zero

pow(base: number, exponent: number): number
  - Computes base^exponent in GF(256) using log tables
  - Handles exponent = 0 (returns 1)

inverse(a: number): number
  - Returns multiplicative inverse: antilog[255 - log[a]]
  - Throws if a == 0

buildLogTable(): number[]
  - Generates the 256-entry discrete log table
  - Uses primitive element α = 2, irreducible poly 0x11D

buildAntilogTable(): number[]
  - Generates the 512-entry (doubled for mod arithmetic) antilog table
```

---

#### `src/core/errorCorrection/polynomial.ts`

Polynomial arithmetic over GF(256) for Reed–Solomon.

```
polyAdd(p: number[], q: number[]): number[]
  - Adds two polynomials coefficient-by-coefficient using gf256.add
  - Pads shorter polynomial with leading zeros

polyMultiply(p: number[], q: number[]): number[]
  - Multiplies two polynomials by convolving coefficients in GF(256)

polyDivide(dividend: number[], divisor: number[]): { quotient: number[], remainder: number[] }
  - Polynomial long division in GF(256)
  - Returns both quotient and remainder (EC codewords = remainder)

buildGeneratorPolynomial(degree: number): number[]
  - Computes generator poly: (x - α⁰)(x - α¹)...(x - α^(degree-1))
  - Caches results by degree (finite set: QR uses degrees 7–30)

evaluatePolynomial(poly: number[], x: number): number
  - Evaluates poly at point x using Horner's method in GF(256)
  - Used in syndrome calculation during decoding
```

---

#### `src/core/errorCorrection/reedSolomon.ts`

Encodes and decodes using Reed–Solomon over GF(256).

```
generateECCodewords(dataCodewords: number[], ecCount: number): number[]
  - Treats dataCodewords as a polynomial message
  - Divides by generator polynomial of degree ecCount
  - Returns the remainder (EC codewords) as a number[]

interleaveBlocks(blocks: Block[]): number[]
  - Interleaves data codewords from multiple blocks column-by-column
  - Appends interleaved EC codewords after

deinterleaveBlocks(interleaved: number[], config: ECBlockConfig[]): Block[]
  - Reverses interleaving to recover individual blocks
  - Required as first step of decoding

calculateSyndromes(received: number[], ecCount: number): number[]
  - Evaluates the received polynomial at α⁰ through α^(ecCount-1)
  - Returns ecCount syndrome values
  - All-zero syndromes → no errors detected

correctErrors(received: number[], syndromes: number[]): CorrectionResult
  - Implements Berlekamp-Massey to find the error-locator polynomial
  - Runs Chien search to find error positions
  - Applies Forney algorithm to calculate error magnitudes
  - Returns: { corrected: number[], errorsFound: number, success: boolean }

encodeBlock(dataCodewords: number[], ecCount: number): EncodedBlock
  - Single-block encode: data codewords → { data, ec }

decodeBlock(received: number[], ecCount: number): DecodedBlock
  - Single-block decode: attempts correction, returns decoded data + metadata
```

---

#### `src/simulation/damageEngine.ts`

Orchestrates damage simulation over a QR matrix.

```
applyDamage(matrix: Matrix, config: DamageConfig): DamagedMatrix
  - Routes to the correct strategy based on config.type
  - Applies damage and returns the modified matrix + damage metadata

getDamageMetadata(original: Matrix, damaged: Matrix): DamageMetadata
  - Returns: { totalModules, damagedModules, damagePercent, affectedRegions }

estimateRecoverability(damaged: Matrix, version: number, ecLevel: ECLevel): RecoverabilityEstimate
  - Analyzes which QR blocks likely have too many errors to recover
  - Returns: { expectedSuccess: boolean, blocksAtRisk: number[], confidence: number }

generateDamageReport(metadata: DamageMetadata): DamageReport
  - Formats damage stats into a structured report for the API response
```

---

#### `src/simulation/strategies/randomNoise.ts`

Applies uniformly distributed random module flips.

```
applyRandomNoise(matrix: Matrix, options: RandomNoiseOptions): Matrix
  - options: { percentage: number, seed?: number }
  - Flips each module with probability = percentage / 100
  - Seed makes runs deterministic for reproducible experiments

generateNoiseMask(size: number, percentage: number, seed?: number): boolean[][]
  - Generates a boolean mask of which modules to flip
  - Usable independently for visualization without modifying the matrix
```

---

#### `src/simulation/strategies/blockErase.ts`

Erases rectangular regions of the matrix.

```
applyBlockErase(matrix: Matrix, options: BlockEraseOptions): Matrix
  - options: { x, y, width, height } or { regions: Rect[] }
  - Sets all modules in the specified region(s) to ERASED state
  - ERASED is distinct from flipped: decoder knows positions are lost (erasure decoding)

applyRandomBlock(matrix: Matrix, options: RandomBlockOptions): Matrix
  - options: { blockSizePercent: number, count: number }
  - Randomly places count blocks of the given relative size

getErasedPositions(matrix: Matrix): Coord[]
  - Returns coordinates of all ERASED modules
  - Used by corrector to pass known erasure positions to RS decoder
```

---

#### `src/simulation/strategies/burstDistortion.ts`

Simulates realistic burst errors (scratches, smears).

```
applyBurst(matrix: Matrix, options: BurstOptions): Matrix
  - options: { angle, length, width, startX, startY }
  - Traces a line across the matrix and erases modules within width
  - Models a scratch or streak on a printed QR code

applyGaussianBlur(matrix: Matrix, options: BlurOptions): Matrix
  - Softens sharp boundaries to simulate ink bleed or blur
  - Modules near a dark/light boundary have a probability of flipping

applyStructuredDistortion(matrix: Matrix, options: DistortionOptions): Matrix
  - Applies barrel or pincushion distortion to module positions
  - Models a photo taken at an angle or through a curved surface
```

---

#### `src/simulation/strategies/logoEmbed.ts`

Embeds an image region into the QR center (the common "logo QR" pattern).

```
embedLogo(matrix: Matrix, options: LogoOptions): Matrix
  - options: { centerX, centerY, width, height, preserveFinderSafezone: boolean }
  - Overwrites modules in the logo region with ERASED state
  - Warns if the damaged region exceeds the EC level's recovery capacity

getMaxSafeLogoSize(version: number, ecLevel: ECLevel): Rect
  - Returns the largest centered rectangle that stays within
    the theoretical erasure correction capacity of this version + EC level

analyzeLogoImpact(matrix: Matrix, logoRegion: Rect, version: number, ecLevel: ECLevel): LogoImpactReport
  - Reports which RS blocks are partially hit, fully hit, or untouched
  - Returns: { impactedBlocks, erasuresPerBlock, likelyRecoverable }
```

---

#### `src/decoder/scanner.ts`

Locates and normalizes a QR code from a raw image or matrix input.

```
detectFinderPatterns(imageData: ImageData): FinderTriangle | null
  - Scans the image for three finder patterns using ratio detection (1:1:3:1:1)
  - Returns the three corner centers or null if not found

computePerspectiveTransform(corners: FinderTriangle): TransformMatrix
  - Calculates the projective transform needed to dewarp the image
  - Returns a 3×3 homography matrix

extractNormalizedMatrix(imageData: ImageData, transform: TransformMatrix, version: number): Matrix
  - Samples module centers using the transform
  - Converts sampled pixel values to BLACK / WHITE / UNKNOWN
  - UNKNOWN is assigned when pixel luminance is ambiguous (near threshold)

readFormatInfo(matrix: Matrix): FormatInfo | null
  - Reads format bits from both reserved regions
  - Attempts primary copy first; falls back to secondary copy
  - Applies BCH error correction if bits are damaged
  - Returns: { ecLevel, maskId } or null on failure
```

---

#### `src/decoder/extractor.ts`

Extracts the data bitstream from a normalized QR matrix.

```
removeMask(matrix: Matrix, maskId: number): Matrix
  - XORs the mask pattern back out of the data modules
  - Inverse of applyMask in mask.ts

extractBitstream(matrix: Matrix): Bits
  - Traverses the matrix in zigzag order (same path as placement.ts)
  - Returns the raw bitstream from data module positions only

separateBlocks(bitstream: Bits, version: number, ecLevel: ECLevel): Block[]
  - De-interleaves the bitstream into individual RS blocks
  - Each block contains data codewords + EC codewords as separate arrays

readModeIndicator(bits: Bits, offset: number): { mode: Mode, bitsRead: number }
  - Reads 4-bit mode indicator at the given offset

readCharacterCount(bits: Bits, offset: number, mode: Mode, version: number): { count: number, bitsRead: number }
  - Reads variable-length character count field for the given mode + version

extractPayload(bits: Bits, mode: Mode, charCount: number, offset: number): string
  - Decodes the data payload using the appropriate mode decoder
  - Returns the recovered string
```

---

#### `src/decoder/corrector.ts`

Applies Reed–Solomon correction to extracted blocks and reconstructs the message.

```
correctAllBlocks(blocks: Block[], version: number, ecLevel: ECLevel): CorrectionSummary
  - Runs reedSolomon.decodeBlock on each block
  - Collects correction outcomes across all blocks
  - Returns: { blocks: CorrectedBlock[], totalErrors, totalFailures, success }

reconstructMessage(correctedBlocks: CorrectedBlock[]): number[]
  - Reassembles data codewords from corrected blocks in order
  - Returns the final flat array of data bytes

decodeMessage(dataBytes: number[]): DecodeResult
  - Parses mode indicator, char count, and payload from data bytes
  - Handles multi-segment messages (mode switches within one QR)
  - Returns: { text, segments, byteLength }

getRecoveryTrace(blocks: CorrectedBlock[]): RecoveryTrace
  - Builds a per-block trace of what happened:
    { blockIndex, errorsDetected, errorsCorrected, positions, magnitudes, status }
  - Used by the visualization engine to highlight recovered modules
```

---

#### `src/analytics/thresholdDetector.ts`

Runs batch experiments to find the fault-tolerance boundary.

```
runDamageThresholdExperiment(config: ExperimentConfig): ExperimentResult
  - config: { version, ecLevel, damageType, minPercent, maxPercent, steps, trialsPerStep }
  - Iterates damage percentage from min to max in N steps
  - Runs multiple trials at each step
  - Returns success rate per damage level

detectThreshold(results: ExperimentResult): ThresholdReport
  - Finds the damage percentage where success rate drops below 50%
  - Returns: { threshold, confidence, sampleSize }

buildHeatmap(matrix: Matrix, version: number, ecLevel: ECLevel): HeatmapData
  - Probes each module's contribution to decode failure
  - Erases one module at a time, runs decode attempt, records outcome
  - Returns a per-module criticality score (0.0–1.0)

analyzeSensitiveRegions(heatmap: HeatmapData): RegionAnalysis
  - Clusters high-criticality modules into named regions
  - Labels regions: format info, finder patterns, timing, data blocks, EC blocks
```

---

#### `src/analytics/reportBuilder.ts`

Formats analytics data into structured reports for the API.

```
buildSimulationReport(results: ExperimentResult, threshold: ThresholdReport): SimulationReport
  - Assembles damage-vs-success curve data ready for charting
  - Returns: { dataPoints, threshold, ecLevel, version, damageType }

buildRecoveryReport(trace: RecoveryTrace, damageMetadata: DamageMetadata): RecoveryReport
  - Merges damage info and correction trace into one report
  - Returns: { errorsDetected, errorsCorrected, blockStatuses, overallSuccess }

buildHeatmapReport(heatmap: HeatmapData, regions: RegionAnalysis): HeatmapReport
  - Formats heatmap as a normalized 2D array for frontend rendering
  - Annotates region boundaries and labels
```

---

#### `src/api/routes/generate.ts`

```
POST /api/generate
  - validateGenerateRequest(req): validates input string, EC level, version override
  - generateQR(input, ecLevel, version?): runs full encoding pipeline,
      returns { matrix, codewords, version, mode, bitstream, svgPreview }

GET /api/generate/capacity?version=&ecLevel=&mode=
  - returns character capacity for the given params
```

---

#### `src/api/routes/damage.ts`

```
POST /api/damage
  - validateDamageRequest(req): validates matrix + damage config
  - applyDamage(matrix, config): runs damageEngine,
      returns { damagedMatrix, metadata, recoverabilityEstimate }

POST /api/damage/preview
  - Returns a visual diff without modifying state
  - Useful for frontend live preview before committing damage params
```

---

#### `src/api/routes/decode.ts`

```
POST /api/decode
  - validateDecodeRequest(req): validates matrix input (original or damaged)
  - decode(matrix, version, ecLevel): runs full scanner → extractor → corrector pipeline
  - Returns { recoveredText, recoveryTrace, correctionSummary, success }
```

---

#### `src/api/routes/simulate.ts`

```
POST /api/simulate/threshold
  - Runs a batch threshold experiment (may be queued for worker)
  - Returns job ID if queued, or full ExperimentResult if fast

GET /api/simulate/status/:jobId
  - Returns job status and partial results for long-running simulations

POST /api/simulate/heatmap
  - Queues or runs a heatmap scan
  - Returns HeatmapReport when complete
```

---

#### `src/utils/binaryUtils.ts`

```
numberToBits(n: number, length: number): Bits
  - Converts integer n to a fixed-length bit array (MSB first)

bitsToNumber(bits: Bits): number
  - Converts a bit array back to an integer

bitsToBytes(bits: Bits): number[]
  - Packs bit array into bytes (pads last byte with zeros if needed)

bytesToBits(bytes: number[]): Bits
  - Unpacks bytes into a flat bit array

xorBits(a: Bits, b: Bits): Bits
  - XORs two equal-length bit arrays
```

---

#### `src/utils/matrixUtils.ts`

```
printMatrix(matrix: Matrix): string
  - Returns ASCII representation for debugging (█ = black, · = white, ? = unknown)

matrixToImageData(matrix: Matrix, moduleSize: number): ImageData
  - Renders matrix to a pixel buffer for API image response

imageDataToMatrix(imageData: ImageData, version: number): Matrix
  - Samples an ImageData buffer to reconstruct a Matrix
  - Used in scanner pipeline

coordsInRegion(coord: Coord, region: Rect): boolean
  - Bounds check: is the coordinate inside the rectangle?

getModuleRegionLabel(row: number, col: number, version: number): RegionLabel
  - Returns what region this module belongs to
    (finder, separator, timing, alignment, format, version, data, ec, dark)
```

---

#### `server.ts`

Application entry point.

```
initializeApp(): Express
  - Registers all route handlers
  - Attaches validation middleware
  - Attaches error handler middleware

startWorkerQueue(): void
  - Initializes BullMQ workers for heavy simulation jobs
  - Registers job processors: threshold, heatmap

main(): void
  - Calls initializeApp() and startWorkerQueue()
  - Starts HTTP server on configured port
  - Logs startup info
```

---

### Frontend Structure

```
frontend/
│
├── src/
│   ├── components/
│   │   ├── QRCanvas.jsx
│   │   ├── DamageEditor.jsx
│   │   ├── MatrixViewer.jsx
│   │   ├── Heatmap.jsx
│   │   ├── RecoveryTrace.jsx
│   │   └── SimulationChart.jsx
│   │
│   ├── pages/
│   │   ├── Playground.jsx
│   │   ├── Simulation.jsx
│   │   └── Analysis.jsx
│   │
│   ├── state/
│   │   ├── qrStore.js
│   │   └── simulationStore.js
│   │
│   ├── hooks/
│   │   ├── useQRGenerator.js
│   │   ├── useDamageEngine.js
│   │   └── useSimulation.js
│   │
│   └── services/
│       ├── api.js
│       └── matrixRenderer.js
│
├── public/
├── index.html
├── package.json
└── main.jsx
```

---

#### `src/components/QRCanvas.jsx`

```
QRCanvas({ matrix, moduleSize, highlightRegions })
  - Renders a QR matrix onto an HTML Canvas element
  - Supports module-level coloring for highlighted regions
  - Re-renders on matrix change via useEffect

drawMatrix(ctx, matrix, moduleSize)
  - Iterates modules, fills black/white/erased/corrupted/recovered
    with distinct colors for each state

drawHighlights(ctx, regions, moduleSize)
  - Overlays color-coded rectangles for named regions (finder, format, data, etc.)

downloadCanvas(filename)
  - Exports the canvas content as a PNG file
```

---

#### `src/components/DamageEditor.jsx`

```
DamageEditor({ matrix, onDamageApplied })
  - Renders damage configuration controls
  - Allows type selection: random noise / block erase / burst / logo embed
  - Shows live recoverability estimate as parameters change

DamagePreview({ original, damaged })
  - Side-by-side canvas: original vs damaged matrix
  - Highlights diffed modules in a warning color

DamageControls({ type, options, onChange })
  - Renders parameter sliders and inputs for the selected damage type
  - Emits change events debounced for live preview
```

---

#### `src/components/MatrixViewer.jsx`

```
MatrixViewer({ original, damaged, corrected, trace })
  - Three-panel view: original / damaged / recovered
  - Syncs hover state across all three panels
  - Clicking a module shows its region label and bit value

ModuleTooltip({ module, coord, regionLabel })
  - Tooltip showing module metadata on hover

ModuleStateKey()
  - Legend for module color states:
    black, white, corrupted, erased, recovered, unrecoverable
```

---

#### `src/components/Heatmap.jsx`

```
Heatmap({ heatmapData, width, height })
  - Renders per-module criticality as a color gradient overlay
  - High criticality = red, low = green
  - Overlays region boundary annotations

HeatmapLegend()
  - Color scale bar from low to high criticality

HeatmapTooltip({ coord, score, regionLabel })
  - Shows criticality score and region name on hover
```

---

#### `src/components/RecoveryTrace.jsx`

```
RecoveryTrace({ trace })
  - Displays a table of block-level correction outcomes
  - Columns: block index, errors detected, errors corrected, status

BlockStatusBadge({ status })
  - Color-coded badge: success / partial / failed

TraceExpandable({ block })
  - Expandable row showing per-error positions and magnitudes for a block
```

---

#### `src/components/SimulationChart.jsx`

```
SimulationChart({ dataPoints, threshold })
  - Line chart: X = damage percentage, Y = success rate
  - Marks the detected threshold with a vertical dashed line
  - Built on Recharts LineChart

ChartTooltip({ active, payload })
  - Custom tooltip showing damage%, success rate, and trial count

ExportChart(chartRef, filename)
  - Exports chart as SVG or PNG
```

---

#### `src/pages/Playground.jsx`

```
Playground()
  - Main interactive workspace: input → generate → damage → decode
  - Orchestrates QRCanvas + DamageEditor + MatrixViewer + RecoveryTrace
  - Manages the step-by-step pipeline state

InputPanel({ onGenerate })
  - Text input, EC level selector, version override
  - Submits to useQRGenerator hook

PipelineSteps({ currentStep })
  - Visual step indicator: generate → damage → decode → analyze
```

---

#### `src/pages/Simulation.jsx`

```
Simulation()
  - Batch experiment configuration and results page
  - Embeds SimulationChart and threshold summary

ExperimentConfigForm({ onRun })
  - Inputs: version, EC level, damage type, min/max damage %, step count, trials

JobStatusPoller({ jobId, onComplete })
  - Polls /api/simulate/status/:jobId every 2s
  - Updates progress bar and partial results as they arrive
```

---

#### `src/pages/Analysis.jsx`

```
Analysis()
  - Heatmap viewer + region analysis report
  - Embeds Heatmap component and RegionAnalysis panel

RegionAnalysisPanel({ regions })
  - Table of critical regions with names, module counts, avg criticality scores

ExportReport({ reportData })
  - Exports the analysis as a JSON or CSV file
```

---

#### `src/state/qrStore.js`

```
State shape:
  { input, ecLevel, version, mode, matrix, codewords, bitstream,
    damagedMatrix, damageMetadata, recoveryTrace, correctionSummary, decodedText }

Actions:
  setInput(input)
  setECLevel(level)
  setGeneratedQR({ matrix, codewords, version, mode, bitstream })
  setDamagedMatrix({ damagedMatrix, metadata })
  setDecodeResult({ trace, summary, text })
  resetAll()
```

---

#### `src/state/simulationStore.js`

```
State shape:
  { experimentConfig, jobId, status, progress, results, threshold, heatmap }

Actions:
  setConfig(config)
  setJobId(id)
  setProgress(percent)
  setResults(results)
  setThreshold(threshold)
  setHeatmap(heatmapData)
  reset()
```

---

#### `src/hooks/useQRGenerator.js`

```
useQRGenerator()
  - generate(input, ecLevel, version?): calls POST /api/generate,
      dispatches setGeneratedQR to store
  - loading: boolean
  - error: string | null
```

---

#### `src/hooks/useDamageEngine.js`

```
useDamageEngine()
  - preview(matrix, config): calls POST /api/damage/preview (no state change)
  - apply(matrix, config): calls POST /api/damage, dispatches setDamagedMatrix
  - decode(damagedMatrix, version, ecLevel): calls POST /api/decode,
      dispatches setDecodeResult
  - loading: boolean
  - error: string | null
```

---

#### `src/hooks/useSimulation.js`

```
useSimulation()
  - runThreshold(config): POST /api/simulate/threshold, starts polling if queued
  - runHeatmap(matrix, version, ecLevel): POST /api/simulate/heatmap
  - pollStatus(jobId): GET /api/simulate/status/:jobId every 2s until done
  - cancelPoll(): stops polling
  - loading, progress, error
```

---

#### `src/services/api.js`

```
generateQR(input, ecLevel, version?)         → POST /api/generate
applyDamage(matrix, config)                  → POST /api/damage
previewDamage(matrix, config)               → POST /api/damage/preview
decodeMatrix(matrix, version, ecLevel)       → POST /api/decode
runThresholdExperiment(config)               → POST /api/simulate/threshold
runHeatmapScan(matrix, version, ecLevel)     → POST /api/simulate/heatmap
getSimulationStatus(jobId)                   → GET  /api/simulate/status/:jobId
getCapacity(version, ecLevel, mode)          → GET  /api/generate/capacity
```

---

#### `src/services/matrixRenderer.js`

```
renderMatrixToCanvas(canvas, matrix, options)
  - Renders a matrix to a given canvas element
  - options: { moduleSize, colorMap, highlightCoords, showGrid }

renderDiffToCanvas(canvas, original, modified, options)
  - Renders a two-matrix diff, coloring changed modules distinctly

renderHeatmapOverlay(canvas, matrix, heatmapData, options)
  - Combines a QR matrix render with a heatmap gradient overlay

exportCanvasAsPNG(canvas, filename)
  - Downloads the canvas as a PNG
```

---

## Encoding Pipeline

The full 9-stage pipeline in order:

| # | Stage | File | Output |
|---|-------|------|--------|
| 1 | Input analysis | `builder.ts` | mode + version |
| 2 | Data encoding | `modeEncoder.ts` | encoded bits |
| 3 | Bitstream construction | `padder.ts` | data codewords |
| 4 | Reed–Solomon encoding | `reedSolomon.ts` | EC codewords |
| 5 | Block interleaving | `reedSolomon.ts` | final bitstream |
| 6 | Matrix initialization | `placement.ts` | function patterns |
| 7 | Data module placement | `placement.ts` | filled matrix |
| 8 | Mask application | `mask.ts` | masked matrix |
| 9 | Format + version info | `format.ts` | final QR matrix |

---

## Roadmap

| Phase | Scope |
|-------|-------|
| MVP | Library-based QR generation, basic noise, decode |
| Core System | Custom matrix engine, damage strategies, visualization |
| Deep Math | Full GF(256) + Reed–Solomon implementation from scratch |
| Research Grade | Batch simulation, threshold detection, heatmaps |
| Advanced | Distributed QR recovery, adaptive QR design, live camera decoder |

---

## Research References

| Paper / Source | Relevance |
|----------------|-----------|
| ISO/IEC 18004 QR Code Standard | Authoritative encoding + placement spec |
| Reed–Solomon Codes (Reed & Solomon, 1960) | Mathematical foundation of EC |
| Aesthetic QR Codes (ART-UP) | Logo embedding + safe damage patterns |
| Distributed Erasure Coding | Future scaling of the simulation engine |
| `unireedsolomon` (Python) | GF(256) reference implementation |
| `jsQR` (JavaScript) | QR decoder reference for scanner pipeline |
| `reedsolomon` (Rust crate) | High-performance RS encoding reference |