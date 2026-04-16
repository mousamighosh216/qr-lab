# QRLab — Phased Development Plan

> From functional prototype to research-grade fault-tolerant encoding system.
> Each phase is independently deployable and builds directly on the previous.

---

## Phase Overview

| Phase | Name | Goal | Estimated Effort |
|-------|------|------|-----------------|
| 0 | Foundation | Repo, tooling, shared types | 1–2 days |
| 1 | Functional Prototype | Working QR: generate → damage → decode | 1–2 weeks |
| 2 | Core Engine | Custom matrix, own damage, visualization | 2–3 weeks |
| 3 | Deep Math | GF(256) + Reed–Solomon from scratch | 2–3 weeks |
| 4 | Simulation Engine | Batch experiments, threshold detection | 1–2 weeks |
| 5 | Analytics & Heatmaps | Criticality maps, failure analysis | 1–2 weeks |
| 6 | Research Grade | Full platform, export, paper-ready | 2–3 weeks |

---

---

# Phase 0 — Foundation

> Set up the project skeleton so every subsequent phase has a clean place to land.

---

## Goals

- Monorepo structure in place
- TypeScript configured end-to-end
- Shared type definitions that all phases will use
- Basic API skeleton running
- React app running with routing
- CI pipeline passing (lint + type-check)

---

## What to Build

### Repo structure

```
qrlab/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   └── routes/        (empty route files)
│   │   ├── utils/
│   │   │   ├── binaryUtils.ts
│   │   │   └── logger.ts
│   │   └── types/
│   │       └── index.ts       (ALL shared types defined here)
│   ├── tsconfig.json
│   ├── package.json
│   └── server.ts
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── api.js
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
│
└── README.md
```

### Files to complete in Phase 0

#### `backend/src/types/index.ts`

Define every type the project will use. Later phases implement against these contracts.

```typescript
// Core primitives
type Bits = number[]
type Matrix = ModuleValue[][]
type ModuleValue = 'BLACK' | 'WHITE' | 'EMPTY' | 'RESERVED' | 'ERASED' | 'CORRUPTED' | 'RECOVERED'
type Coord = { row: number; col: number }
type Rect = { x: number; y: number; width: number; height: number }

// Encoding
type Mode = 'numeric' | 'alphanumeric' | 'byte' | 'kanji'
type ECLevel = 'L' | 'M' | 'Q' | 'H'
type InputAnalysis = { mode: Mode; characterCount: number; estimatedBitLength: number }

// Error correction
type Block = { data: number[]; ec: number[] }
type EncodedBlock = { data: number[]; ec: number[] }
type DecodedBlock = { data: number[]; errorsFound: number; success: boolean }
type CorrectionResult = { corrected: number[]; errorsFound: number; success: boolean }
type ECBlockConfig = { count: number; dataCodewords: number; ecCodewordsPerBlock: number }

// Damage
type DamageType = 'randomNoise' | 'blockErase' | 'burst' | 'logoEmbed'
type DamageConfig = { type: DamageType; options: Record<string, unknown> }
type DamageMetadata = { totalModules: number; damagedModules: number; damagePercent: number }

// Decode
type RecoveryTrace = { blockIndex: number; errorsDetected: number; errorsCorrected: number; status: 'success' | 'partial' | 'failed' }[]
type CorrectionSummary = { totalErrors: number; totalFailures: number; success: boolean }
type DecodeResult = { text: string; success: boolean; trace: RecoveryTrace; summary: CorrectionSummary }

// Simulation
type ExperimentConfig = { version: number; ecLevel: ECLevel; damageType: DamageType; minPercent: number; maxPercent: number; steps: number; trialsPerStep: number }
type DataPoint = { damagePercent: number; successRate: number; trials: number }
type ExperimentResult = { dataPoints: DataPoint[]; config: ExperimentConfig }
type ThresholdReport = { threshold: number; confidence: number; sampleSize: number }
type HeatmapData = number[][]
```

#### `backend/src/utils/binaryUtils.ts`

```typescript
numberToBits(n: number, length: number): Bits
bitsToNumber(bits: Bits): number
bitsToBytes(bits: Bits): number[]
bytesToBits(bytes: number[]): Bits
xorBits(a: Bits, b: Bits): Bits
```

#### `backend/src/utils/logger.ts`

Simple structured logger. One function: `log(level, message, data?)`.

#### `backend/server.ts`

Express app with a single `GET /health` route returning `{ status: 'ok' }`. All real routes registered as empty stubs.

#### `frontend/src/services/api.js`

All API calls defined as async functions, all returning mock data for now. Real implementations drop in per-phase.

---

## Exit Criteria

- `npm run dev` starts both backend and frontend without errors
- `GET /health` returns 200
- TypeScript compiles with zero errors
- Lint passes

---

---

# Phase 1 — Functional Prototype

> A working end-to-end pipeline using third-party libraries.
> Real QR codes. Real damage. Real decode attempts. No custom math yet.

---

## Goals

- User types text → QR code appears
- User applies damage → damaged QR appears
- System attempts decode → result shown
- Everything connected through a simple UI
- No custom matrix engine, no custom RS — use libraries

---

## Libraries to use in this phase

| Purpose | Library |
|---------|---------|
| QR generation | `qrcode` (npm) |
| QR decoding | `jsQR` |
| Matrix image processing | `sharp` (Node) or Canvas API |
| Frontend state | React `useState` (no store yet) |
| Charts | Recharts |

---

## What to Build

### Backend

#### `src/core/qr/version.ts` (partial — lookup tables only)

```typescript
getVersionCapacity(version: number, ecLevel: ECLevel, mode: Mode): number
getECBlockConfig(version: number, ecLevel: ECLevel): ECBlockConfig[]
getTotalDataCodewords(version: number, ecLevel: ECLevel): number
getModuleCount(version: number): number
```

Fill in the raw capacity table data from the QR ISO standard.
No calculation logic yet — pure lookup table.

#### `src/core/bitstream/builder.ts` (partial)

```typescript
analyzeInput(input: string): InputAnalysis
  // Determines mode by scanning characters
  // Does NOT select version yet — delegate to library

selectVersion(mode: Mode, ecLevel: ECLevel, charCount: number): number
  // Consults version.ts lookup table
```

#### `src/simulation/damageEngine.ts` (partial)

```typescript
applyDamage(matrix: Matrix, config: DamageConfig): DamagedMatrix
getDamageMetadata(original: Matrix, damaged: Matrix): DamageMetadata
```

Wire to strategies below. Only implement `randomNoise` in this phase.

#### `src/simulation/strategies/randomNoise.ts`

```typescript
applyRandomNoise(matrix: Matrix, options: RandomNoiseOptions): Matrix
generateNoiseMask(size: number, percentage: number, seed?: number): boolean[][]
```

This is the first damage strategy. Seed support is important — reproducible experiments from day one.

#### `src/api/routes/generate.ts`

```
POST /api/generate
  - Input: { text, ecLevel }
  - Uses qrcode library to generate
  - Converts library output to Matrix type (our internal format)
  - Returns { matrix, version, ecLevel, svgPreview }
```

#### `src/api/routes/damage.ts`

```
POST /api/damage
  - Input: { matrix, config }
  - Runs damageEngine.applyDamage
  - Returns { damagedMatrix, metadata }
```

#### `src/api/routes/decode.ts`

```
POST /api/decode
  - Input: { matrix }
  - Converts matrix back to image buffer
  - Runs jsQR on image buffer
  - Returns { text, success }
  - No recovery trace yet — that comes in Phase 3
```

#### `src/api/middleware/validate.ts`

```typescript
validateGenerateRequest(req): void   // throws 400 on bad input
validateDamageRequest(req): void
validateDecodeRequest(req): void
```

#### `src/api/middleware/errorHandler.ts`

```typescript
errorHandler(err, req, res, next): void
  // Returns { error: message, code } JSON for all thrown errors
```

---

### Frontend

#### `src/pages/Playground.jsx`

Three-panel layout only. No simulation tab yet.

```jsx
Playground()
  // Panel 1: InputPanel
  // Panel 2: DamageEditor (random noise only)
  // Panel 3: DecodeResult
```

#### `src/components/QRCanvas.jsx`

```jsx
QRCanvas({ matrix, moduleSize })
  // Renders a Matrix onto HTML Canvas
  // Module colors: black, white, erased (red)

drawMatrix(ctx, matrix, moduleSize)
downloadCanvas(filename)
```

#### `src/components/DamageEditor.jsx` (partial)

```jsx
DamageEditor({ matrix, onDamageApplied })
  // Only random noise controls for now:
  // - damage percentage slider (0–100%)
  // - seed input for reproducibility
  // - Apply button

DamageControls({ type, options, onChange })
```

#### `src/services/api.js` (Phase 1 implementation)

Replace Phase 0 mocks with real fetch calls:

```javascript
generateQR(input, ecLevel)          → POST /api/generate
applyDamage(matrix, config)         → POST /api/damage
decodeMatrix(matrix)                → POST /api/decode
```

---

## What this phase produces

A user can:
1. Type any text, pick EC level, click Generate — see a QR code
2. Adjust noise percentage, click Apply — see damaged QR
3. Click Decode — see whether text was recovered or not

No math internals visible yet. No visualization of correction. Just: does it work or not.

---

## Exit Criteria

- Generate a QR for any text input at all four EC levels
- Apply random noise at 5%, 15%, 30% — decode succeeds at lower levels, fails at higher
- Decode result shows recovered text or clear failure message
- All three steps work end-to-end without page reload

---

---

# Phase 2 — Core Engine

> Replace library calls with our own matrix engine.
> Add the remaining damage strategies.
> Add the three-panel matrix visualization.

---

## Goals

- Own every byte of the QR matrix — no library black box
- See original / damaged / recovered side by side
- Block erase, burst, and logo embed damage strategies working
- `matrixUtils.ts` tooling complete
- Frontend MatrixViewer component live

---

## What to Build

### Backend — encoding pipeline (custom, no library)

Implement the full 9-stage pipeline from the encoding spec.

#### `src/core/bitstream/modeEncoder.ts`

```typescript
encodeNumeric(input: string): Bits
encodeAlphanumeric(input: string): Bits
encodeByte(input: string): Bits
encodeKanji(input: string): Bits
getAlphanumericValue(char: string): number
```

#### `src/core/bitstream/builder.ts` (complete)

```typescript
buildModeIndicator(mode: Mode): Bits
buildCharacterCountIndicator(mode: Mode, version: number, charCount: number): Bits
encodeData(input: string, mode: Mode): Bits
buildBitstream(input: string, mode: Mode, version: number): Bits
```

#### `src/core/bitstream/padder.ts`

```typescript
getDataCodewordCapacity(version: number, ecLevel: ECLevel): number
appendTerminator(bits: Bits, capacity: number): Bits
byteAlign(bits: Bits): Bits
appendFillBytes(bits: Bits, capacity: number): Bits
pad(bits: Bits, version: number, ecLevel: ECLevel): Bits
```

#### `src/core/qr/matrix.ts`

```typescript
createMatrix(version: number): Matrix
getModuleSize(version: number): number
setModule(matrix: Matrix, row: number, col: number, value: ModuleValue): void
getModule(matrix: Matrix, row: number, col: number): ModuleValue
cloneMatrix(matrix: Matrix): Matrix
diffMatrix(original: Matrix, damaged: Matrix): DiffResult
```

#### `src/core/qr/placement.ts`

```typescript
placeFinderPatterns(matrix: Matrix): void
placeSeparators(matrix: Matrix): void
placeTimingPatterns(matrix: Matrix): void
placeAlignmentPatterns(matrix: Matrix, version: number): void
placeDarkModule(matrix: Matrix, version: number): void
reserveFormatRegions(matrix: Matrix): void
reserveVersionRegions(matrix: Matrix, version: number): void
placeDataModules(matrix: Matrix, bitstream: Bits): void
```

#### `src/core/qr/mask.ts`

```typescript
getMaskFunction(maskId: number): (row: number, col: number) => boolean
applyMask(matrix: Matrix, maskId: number): Matrix
evaluatePenalty(matrix: Matrix): number
selectBestMask(matrix: Matrix): { maskId: number; maskedMatrix: Matrix }
```

#### `src/core/qr/format.ts`

```typescript
encodeFormatString(ecLevel: ECLevel, maskId: number): Bits
writeFormatInfo(matrix: Matrix, formatBits: Bits): void
encodeVersionString(version: number): Bits
writeVersionInfo(matrix: Matrix, versionBits: Bits, version: number): void
```

At the end of Phase 2, the generate route uses this custom pipeline exclusively. Remove the `qrcode` library dependency.

---

### Backend — remaining damage strategies

#### `src/simulation/strategies/blockErase.ts`

```typescript
applyBlockErase(matrix: Matrix, options: BlockEraseOptions): Matrix
applyRandomBlock(matrix: Matrix, options: RandomBlockOptions): Matrix
getErasedPositions(matrix: Matrix): Coord[]
```

#### `src/simulation/strategies/burstDistortion.ts`

```typescript
applyBurst(matrix: Matrix, options: BurstOptions): Matrix
applyGaussianBlur(matrix: Matrix, options: BlurOptions): Matrix
applyStructuredDistortion(matrix: Matrix, options: DistortionOptions): Matrix
```

#### `src/simulation/strategies/logoEmbed.ts`

```typescript
embedLogo(matrix: Matrix, options: LogoOptions): Matrix
getMaxSafeLogoSize(version: number, ecLevel: ECLevel): Rect
analyzeLogoImpact(matrix: Matrix, logoRegion: Rect, version: number, ecLevel: ECLevel): LogoImpactReport
```

#### `src/simulation/damageEngine.ts` (complete)

```typescript
applyDamage(matrix: Matrix, config: DamageConfig): DamagedMatrix
getDamageMetadata(original: Matrix, damaged: Matrix): DamageMetadata
estimateRecoverability(damaged: Matrix, version: number, ecLevel: ECLevel): RecoverabilityEstimate
generateDamageReport(metadata: DamageMetadata): DamageReport
```

#### `src/utils/matrixUtils.ts`

```typescript
printMatrix(matrix: Matrix): string
matrixToImageData(matrix: Matrix, moduleSize: number): ImageData
imageDataToMatrix(imageData: ImageData, version: number): Matrix
coordsInRegion(coord: Coord, region: Rect): boolean
getModuleRegionLabel(row: number, col: number, version: number): RegionLabel
```

---

### Frontend

#### `src/components/MatrixViewer.jsx`

```jsx
MatrixViewer({ original, damaged, corrected, trace })
  // Three-panel synchronized view

ModuleTooltip({ module, coord, regionLabel })
ModuleStateKey()
```

#### `src/components/DamageEditor.jsx` (complete)

Add controls for the three new damage types:

```jsx
DamageEditor({ matrix, onDamageApplied })
DamagePreview({ original, damaged })
DamageControls({ type, options, onChange })
  // Renders correct controls for: randomNoise / blockErase / burst / logoEmbed
```

#### `src/services/matrixRenderer.js`

```javascript
renderMatrixToCanvas(canvas, matrix, options)
renderDiffToCanvas(canvas, original, modified, options)
renderHeatmapOverlay(canvas, matrix, heatmapData, options)
exportCanvasAsPNG(canvas, filename)
```

#### `src/state/qrStore.js`

Migrate from `useState` to a proper store (Zustand or Redux):

```javascript
// State: input, ecLevel, version, mode, matrix, codewords, bitstream,
//        damagedMatrix, damageMetadata, recoveryTrace, correctionSummary, decodedText
setInput, setECLevel, setGeneratedQR, setDamagedMatrix, setDecodeResult, resetAll
```

---

## Exit Criteria

- QR generation uses zero external QR libraries — pure custom pipeline
- All four damage types work and are selectable in the UI
- MatrixViewer shows three panels with correct color-coding per module state
- Hovering a module shows its region label (finder, timing, data, format, etc.)
- Logo embed warns when the logo region exceeds safe EC capacity

---

---

# Phase 3 — Deep Math

> Implement GF(256) and Reed–Solomon from scratch.
> Wire the custom RS encoder into the pipeline.
> Wire the RS decoder so recovery trace becomes visible in the UI.

---

## Goals

- No RS library dependency anywhere
- Decoder reports exactly which blocks failed, which recovered, and which errors were found
- RecoveryTrace component shows per-block correction outcome
- Erasure decoding supported (known-position damage from blockErase)

---

## What to Build

### Backend

#### `src/core/errorCorrection/gf256.ts`

```typescript
buildLogTable(): number[]
buildAntilogTable(): number[]
add(a: number, b: number): number
multiply(a: number, b: number): number
divide(a: number, b: number): number
pow(base: number, exponent: number): number
inverse(a: number): number
```

Build the log/antilog tables first. Every other function depends on them.
Irreducible polynomial: `x⁸ + x⁴ + x³ + x² + 1` → `0x11D`.
Primitive element: `α = 2`.

Verify table correctness:
- `multiply(3, 5)` must equal `15` in GF(256)  (not regular 15)
- `multiply(a, inverse(a))` must equal `1` for all a ≠ 0
- `add(a, a)` must equal `0` for all a (XOR property)

#### `src/core/errorCorrection/polynomial.ts`

```typescript
polyAdd(p: number[], q: number[]): number[]
polyMultiply(p: number[], q: number[]): number[]
polyDivide(dividend: number[], divisor: number[]): { quotient: number[]; remainder: number[] }
buildGeneratorPolynomial(degree: number): number[]
evaluatePolynomial(poly: number[], x: number): number
```

`buildGeneratorPolynomial` is called once per EC block size and cached.
Generator for degree n: `(x - α⁰)(x - α¹)...(x - α^(n-1))`.

#### `src/core/errorCorrection/reedSolomon.ts`

Build in this order — each function depends on the one above it:

```typescript
// Encoding side
generateECCodewords(dataCodewords: number[], ecCount: number): number[]
  // message poly / generator poly → remainder = EC codewords

encodeBlock(dataCodewords: number[], ecCount: number): EncodedBlock
interleaveBlocks(blocks: Block[]): number[]

// Decoding side
calculateSyndromes(received: number[], ecCount: number): number[]
  // if all syndromes are zero → no errors, fast path

correctErrors(received: number[], syndromes: number[]): CorrectionResult
  // 1. Berlekamp-Massey → error locator polynomial
  // 2. Chien search    → error positions
  // 3. Forney algorithm → error magnitudes
  // 4. XOR corrections into received

deinterleaveBlocks(interleaved: number[], config: ECBlockConfig[]): Block[]
decodeBlock(received: number[], ecCount: number): DecodedBlock
correctAllBlocks(blocks: Block[], version: number, ecLevel: ECLevel): CorrectionSummary
```

Implement Berlekamp-Massey carefully — it is the hardest piece.
Start with the simpler Euclidean algorithm for the error locator polynomial and swap to BM once it is verified correct.

#### `src/decoder/extractor.ts`

```typescript
removeMask(matrix: Matrix, maskId: number): Matrix
extractBitstream(matrix: Matrix): Bits
separateBlocks(bitstream: Bits, version: number, ecLevel: ECLevel): Block[]
readModeIndicator(bits: Bits, offset: number): { mode: Mode; bitsRead: number }
readCharacterCount(bits: Bits, offset: number, mode: Mode, version: number): { count: number; bitsRead: number }
extractPayload(bits: Bits, mode: Mode, charCount: number, offset: number): string
```

#### `src/decoder/scanner.ts`

```typescript
detectFinderPatterns(imageData: ImageData): FinderTriangle | null
computePerspectiveTransform(corners: FinderTriangle): TransformMatrix
extractNormalizedMatrix(imageData: ImageData, transform: TransformMatrix, version: number): Matrix
readFormatInfo(matrix: Matrix): FormatInfo | null
```

#### `src/decoder/corrector.ts`

```typescript
correctAllBlocks(blocks: Block[], version: number, ecLevel: ECLevel): CorrectionSummary
reconstructMessage(correctedBlocks: CorrectedBlock[]): number[]
decodeMessage(dataBytes: number[]): DecodeResult
getRecoveryTrace(blocks: CorrectedBlock[]): RecoveryTrace
```

Update `POST /api/decode` to use the full custom pipeline:
`scanner → extractor → corrector → decodeMessage`
Return the full `RecoveryTrace` in the response.

---

### Frontend

#### `src/components/RecoveryTrace.jsx`

```jsx
RecoveryTrace({ trace })
  // Per-block table: block index, errors detected, corrected, status badge

BlockStatusBadge({ status })
  // success = green, partial = amber, failed = red

TraceExpandable({ block })
  // Expands to show error byte positions and magnitudes
```

---

## Testing checklist for this phase

Before moving on, verify these invariants manually:

- Encode a known string → extract bitstream → decode without damage → exact match
- Encode → flip 1 byte → decode → corrected (EC-L should handle this)
- Encode at EC-H → flip up to 30% of codewords in one block → still decodes
- Encode at EC-L → flip > 7% codewords → fail gracefully with clear error, no crash
- `calculateSyndromes` on a clean encode → all zeros

---

## Exit Criteria

- `jsQR` removed from dependencies — decode uses only our pipeline
- RecoveryTrace UI shows per-block outcomes after every decode
- Errors detected ≠ errors corrected for partially damaged QRs (distinguishable states)
- Custom RS encoder produces identical output to Phase 1 library for the same input

---

---

# Phase 4 — Simulation Engine

> Run batch experiments programmatically.
> Detect the damage threshold at which decode fails.
> Wire results to SimulationChart in the UI.

---

## Goals

- Run 100s of encode → damage → decode trials automatically
- Chart success rate vs damage percentage
- Detect threshold: the % at which success drops below 50%
- Long-running jobs run in a worker queue, not the request thread

---

## What to Build

### Backend

#### `src/analytics/thresholdDetector.ts`

```typescript
runDamageThresholdExperiment(config: ExperimentConfig): ExperimentResult
  // For each damage level from minPercent to maxPercent:
  //   Run trialsPerStep trials
  //   For each trial: generate → damage → decode
  //   Record success/failure
  //   Build DataPoint: { damagePercent, successRate, trials }

detectThreshold(results: ExperimentResult): ThresholdReport
  // Find first damage level where successRate < 0.5
  // Calculate confidence from sample size and variance

buildHeatmap(matrix: Matrix, version: number, ecLevel: ECLevel): HeatmapData
  // For each module (row, col):
  //   Clone matrix, erase that module, attempt decode
  //   Record 1 = failure triggered, 0 = still decoded
  //   Return as 2D float array (criticality score per module)

analyzeSensitiveRegions(heatmap: HeatmapData): RegionAnalysis
  // Group high-criticality modules by region label
  // Return named regions sorted by avg criticality
```

#### `src/analytics/reportBuilder.ts`

```typescript
buildSimulationReport(results: ExperimentResult, threshold: ThresholdReport): SimulationReport
buildRecoveryReport(trace: RecoveryTrace, damageMetadata: DamageMetadata): RecoveryReport
buildHeatmapReport(heatmap: HeatmapData, regions: RegionAnalysis): HeatmapReport
```

#### `src/api/routes/simulate.ts`

```
POST /api/simulate/threshold
  - Small experiments (≤ 500 total trials): run inline, return result
  - Large experiments: queue as BullMQ job, return { jobId }

GET /api/simulate/status/:jobId
  - Returns { status, progress, partialResults }
  - partialResults updates as each damage level completes

POST /api/simulate/heatmap
  - Always queued (N × N trials where N = matrix size)
  - Returns { jobId }
```

#### Worker setup

Add BullMQ to backend dependencies.
Define two job types: `threshold-experiment` and `heatmap-scan`.
Each job reports progress at each damage step so the frontend can poll partial results.

```typescript
// in server.ts
startWorkerQueue(): void
  // Registers threshold-experiment and heatmap-scan processors
```

---

### Frontend

#### `src/pages/Simulation.jsx`

```jsx
Simulation()
ExperimentConfigForm({ onRun })
  // Inputs: version, EC level, damage type, min%, max%, steps, trialsPerStep
JobStatusPoller({ jobId, onComplete })
  // Polls every 2s, updates progress bar + partial chart
```

#### `src/components/SimulationChart.jsx`

```jsx
SimulationChart({ dataPoints, threshold })
  // Recharts LineChart: X = damage%, Y = success rate
  // Threshold marked as vertical dashed line

ChartTooltip({ active, payload })
ExportChart(chartRef, filename)
```

#### `src/hooks/useSimulation.js`

```javascript
runThreshold(config)        // POST /api/simulate/threshold → poll if queued
runHeatmap(matrix, ...)     // POST /api/simulate/heatmap → poll
pollStatus(jobId)           // Polls every 2s until done
cancelPoll()
// state: loading, progress, error
```

#### `src/state/simulationStore.js`

```javascript
// State: experimentConfig, jobId, status, progress, results, threshold, heatmap
setConfig, setJobId, setProgress, setResults, setThreshold, setHeatmap, reset
```

---

## Exit Criteria

- Run a 5-step, 20-trial-per-step experiment and see results chart within 30 seconds
- Threshold detection correctly identifies the known limits for EC levels L/M/Q/H
- Long jobs (500+ trials) queue correctly and show progress without timing out
- Chart export works (PNG and SVG)

---

---

# Phase 5 — Analytics & Heatmaps

> Visualize which parts of a QR are most critical.
> Build the Analysis page with full region-level reporting.

---

## Goals

- Per-module criticality heatmap rendered over the QR matrix
- Named region analysis: finder patterns most critical, which data blocks most vulnerable
- Full Analysis page with export

---

## What to Build

### Backend

`thresholdDetector.ts` — `buildHeatmap` and `analyzeSensitiveRegions` are already defined in Phase 4.
In Phase 5, optimize `buildHeatmap` to batch module probes efficiently (it runs N² decode attempts — cache the base encode and only re-decode).

#### `src/utils/matrixUtils.ts` (complete)

```typescript
getModuleRegionLabel(row: number, col: number, version: number): RegionLabel
  // Returns: 'finder' | 'separator' | 'timing' | 'alignment' |
  //          'format' | 'version' | 'data' | 'ec' | 'dark' | 'unknown'
```

This is the key function for region analysis — it must correctly label every module in any version.

---

### Frontend

#### `src/components/Heatmap.jsx`

```jsx
Heatmap({ heatmapData, width, height })
  // Renders per-module criticality as color gradient overlay on QR canvas
  // Low criticality = green, high = red

HeatmapLegend()
  // Color scale bar

HeatmapTooltip({ coord, score, regionLabel })
```

#### `src/pages/Analysis.jsx`

```jsx
Analysis()
RegionAnalysisPanel({ regions })
  // Table: region name, module count, avg criticality, max criticality
ExportReport({ reportData })
  // Exports as JSON or CSV
```

#### `src/services/matrixRenderer.js` — add:

```javascript
renderHeatmapOverlay(canvas, matrix, heatmapData, options)
  // Blends the QR matrix with the heatmap color layer
```

---

## Expected findings (document these in your Analysis page)

- Finder patterns: extremely high criticality (scanner cannot locate QR without them)
- Format information region: very high (without it, decoder cannot determine mask or EC level)
- Timing patterns: moderate (needed to determine module grid spacing)
- Alignment patterns: moderate for high versions, absent for V1
- Data block 1 codewords: criticality varies by interleaving position
- EC codewords: lower individual criticality (their job is to be expendable)

---

## Exit Criteria

- Heatmap renders correctly over any generated QR matrix
- Clicking a module in the heatmap shows its region label + criticality score
- Region analysis table correctly identifies finder patterns as highest-criticality region
- Export produces a valid JSON report with all per-region data

---

---

# Phase 6 — Research Grade

> The complete platform. Clean UI, all pages functional, exportable reports, paper-ready output.

---

## Goals

- All pages polished: Playground, Simulation, Analysis
- Every decode produces a full report exportable as JSON
- Batch experiment results exportable as CSV
- Codeword and bitstream inspector panel (see the actual bytes)
- Version and format info inspector
- README and architecture docs complete
- Suitable as a portfolio project or appendix to a research paper

---

## What to Build

### Backend additions

#### `src/api/routes/generate.ts` — extend response

Add to the generate response:
```json
{
  "matrix": [...],
  "version": 3,
  "ecLevel": "M",
  "mode": "byte",
  "bitstream": [0, 1, 0, 0, ...],
  "dataCodewords": [32, 91, ...],
  "ecCodewords": [196, 35, ...],
  "blockConfig": [...],
  "svgPreview": "..."
}
```

This enables the frontend codeword inspector to show real values.

#### `src/analytics/reportBuilder.ts` — add:

```typescript
buildFullReport(qr, damage, decode, simulation?): FullReport
  // Combines generate metadata + damage report + recovery report
  // + optional simulation results into a single exportable object
```

---

### Frontend additions

#### Codeword Inspector panel (new component)

```jsx
CodewordInspector({ dataCodewords, ecCodewords, blockConfig })
  // Grid showing each codeword as a hex byte
  // Color-coded: data bytes vs EC bytes vs fill bytes
  // Hover shows byte index, block membership, bit values

BitstreamInspector({ bitstream, version, mode })
  // Shows raw bits grouped by: mode indicator, char count, data, terminator, padding
```

#### Format Info panel (new component)

```jsx
FormatInfoPanel({ ecLevel, maskId, formatBits, versionBits? })
  // Shows the 15-bit format string broken into:
  //   EC level bits | mask ID bits | BCH bits
  // Shows the XOR mask applied
  // Shows both format info copies on the matrix (highlight on hover)
```

#### `src/pages/Playground.jsx` — finalize

```jsx
PipelineSteps({ currentStep })
  // Visual stepper: Generate → Damage → Decode → Analyze
  // Each step is clickable to jump

InputPanel({ onGenerate })
  // Add: character count indicator, mode auto-detection display,
  //      version capacity indicator (X/Y chars used)
```

#### Export system

```javascript
// In each page:
exportFullReport(state)       // Downloads JSON of the full pipeline state
exportBatchResults(results)   // Downloads CSV of simulation data points
exportHeatmap(heatmapData)    // Downloads CSV of per-module criticality scores
```

---

## Documentation

Complete the following before calling Phase 6 done:

- `README.md` — project overview, setup, pipeline summary (the one generated earlier)
- `ARCHITECTURE.md` — system design with data flow, subsystem descriptions
- `MATH.md` — GF(256) construction, RS encoding/decoding walkthrough with worked examples
- `API.md` — full API reference with request/response shapes for every endpoint
- `EXPERIMENTS.md` — document the threshold findings per EC level, heatmap observations, surprising results

---

## Exit Criteria

- All three pages fully functional: Playground, Simulation, Analysis
- A new user can run the full pipeline in under 2 minutes without reading docs
- Every output is exportable
- Codeword inspector shows real data/EC bytes for any generated QR
- Zero library dependencies for QR generation, encoding, or Reed–Solomon

---

---

# Appendix — Dependency Timeline

| Library | Added | Removed | Reason |
|---------|-------|---------|--------|
| `qrcode` | Phase 1 | Phase 2 | Replaced by custom encoder |
| `jsQR` | Phase 1 | Phase 3 | Replaced by custom decoder |
| `sharp` | Phase 1 | Phase 3 | Replaced by matrixUtils |
| `recharts` | Phase 1 | Never | Charting (keep) |
| `bullmq` | Phase 4 | Never | Job queue (keep) |
| `express` | Phase 0 | Never | API server (keep) |

---

# Appendix — File Build Order

Build files in this order to minimize rework. Each file depends only on files above it.

```
Phase 0:  types/index.ts → binaryUtils.ts → logger.ts → server.ts

Phase 1:  version.ts (tables) → builder.ts (partial) → randomNoise.ts
          → damageEngine.ts (partial) → generate.ts → damage.ts → decode.ts

Phase 2:  modeEncoder.ts → builder.ts (complete) → padder.ts
          → matrix.ts → version.ts (complete) → placement.ts → mask.ts → format.ts
          → blockErase.ts → burstDistortion.ts → logoEmbed.ts → damageEngine.ts (complete)
          → matrixUtils.ts

Phase 3:  gf256.ts → polynomial.ts → reedSolomon.ts (encode half)
          → reedSolomon.ts (decode half) → extractor.ts → scanner.ts → corrector.ts

Phase 4:  thresholdDetector.ts (experiment) → reportBuilder.ts → simulate.ts → worker setup

Phase 5:  thresholdDetector.ts (heatmap) → matrixUtils.ts (complete) → Analysis page

Phase 6:  Inspector components → export system → documentation
```
