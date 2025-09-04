
# node-saveaio

Plain-JS toolkit for working with retro **save files**. Provides small, composable buffer utilities (endian swap, word swap, trim/expand, pad-to-size) plus stubs for common container adapters (DexDrive, Wii U VC, 3DS VC). No TypeScript, no build step, and **no CLI**—just functions and a tiny `SaveFile` wrapper class.

- **Language:** JavaScript (Node >= 18)
- **Modules:** ESM + CommonJS (`index.js` + `index.cjs`)
- **Design:** Buffer in → Buffer out. You control file I/O.

---


---

## Supported Operations

✔️ Tested & Supported  
🟨 Unimplemented  
❌ Not Supported  
🟦 Special Notes  

### Nintendo 64
- **General**
  - Byte Swapping ✔️
  - Word Swapping ✔️
  - _NOTE_: Many N64 emulators and flash cartridges do not use headers, but often require byte and/or word swapping in order to be compatible. Try all 4 variants (raw, byteswapped, wordswapped, both) when moving between systems.
- **DexDrive**
  - Extract ✔️
  - Inject 🟨

### Game Boy Advance
- **GameShark / Action Replay**
  - Extract ✔️
  - Inject 🟨
- **GameShark SP**
  - Extract ✔️
  - Inject 🟨

### Nintendo 3DS (Virtual Console)
- NES
  - Extract 🟨
  - Inject 🟨
- SNES
  - Extract 🟨
  - Inject 🟨
- Game Boy / Game Boy Color
  - Extract 🟨
  - Inject 🟨
- GBA
  - Extract 🟨
  - Inject 🟨

### Nintendo Wii (Virtual Console)
- NES
  - Extract 🟨
  - Inject 🟨
- SNES
  - Extract 🟨
  - Inject 🟨
- Sega Genesis
  - Extract 🟨
  - Inject 🟨
- Nintendo 64
  - Extract 🟦 (see note above)
  - Inject 🟦 (see note above)

### Nintendo Wii U (Virtual Console)
- NES
  - Extract 🟨
  - Inject 🟨
- SNES
  - Extract 🟨
  - Inject 🟨
- GBA
  - Extract ✔️
  - Inject ✔️
- DS
  - Extract 🟨
  - Inject 🟨





## Install

```bash
npm i node-saveaio
```

> Until published to npm, clone/extract this repo and `npm link` locally, or import via a relative path.

---

## Usage

### ESM
```js
import { SaveFile, swapEndian, trimTrailingZeros } from "node-saveaio";
import { readFile, writeFile } from "node:fs/promises";

const raw = await readFile("./mario64.sav");
const s = new SaveFile(raw);

// mutate in-place (on the internal buffer)
s.swapSaveFileEndian(2);
s.trimSaveWhitespace();
await s.exportToFile("./mario64_fixed.sav");

// or compose pure helpers
const swapped = swapEndian(raw, 2);
const trimmed = trimTrailingZeros(swapped);
await writeFile("./mario64_swapped_trimmed.sav", trimmed);
```

### CommonJS
```js
const { SaveFile, expandToNextPow2 } = require("node-saveaio");
const fs = require("node:fs");

const raw = fs.readFileSync("./zelda.oot");
const s = new SaveFile(raw);
s.expandSaveFileWhitespace();
fs.writeFileSync("./zelda_padded.oot", s.exportToMemory());
```

---

## API

### Buffer utilities (pure)
- `swapEndian(buffer, bytes = 2): Buffer` — byte order swap within fixed-size chunks (2/4/8).
- `swapWords(buffer, bytes = 2): Buffer` — swap adjacent “words” of `bytes` each.
- `trimTrailingZeros(buffer): Buffer` — strip trailing `0x00` bytes.
- `setSize(buffer, bytes): Buffer` — pad to exact size with `0x00` (no-op if already ≥ size).
- `expandToNextPow2(buffer): Buffer` — pad to the next power-of-two size.

### SaveFile (ergonomic wrapper)
```js
new SaveFile(buffer)
.saveFileSize(bytes)           // -> setSaveFileSize(bytes)
.expandSaveFileWhitespace()    // -> pad to next pow2
.trimSaveWhitespace()          // -> trim trailing 0x00
.swapSaveFileEndian(bytes=2)
.swapSaveFileWords(bytes=2)
.exportToMemory() : Buffer
.exportToFile(filePath) : Promise<string>
.inject(buffer)                // replace underlying buffer
```

### Container adapters (stubs—fill these in as you port logic)
- `decodeDexDrive(container): Buffer` / `encodeDexDrive(baseSave): Buffer`
- `decodeWiiUSNESVC(container): Buffer` / `encodeWiiUSNESVC(baseSave): Buffer`
- `decode3DSSNESVC(container): Buffer` / `encode3DSSNESVC(baseSave): Buffer`

> The adapter functions should stay **pure** (no fs). Parse headers/metadata, verify checksums, and return a base save buffer.

---

## Project structure

```
package.json
index.js        # ESM entry
index.cjs       # CJS entry
src/
  lib.cjs
  buffers/
    endian.cjs
    words.cjs
    whitespace.cjs
    size.cjs
  core/
    SaveFile.cjs
  adapters/
    n64.dexdrive.cjs
    snes.vc.wiiu.cjs
    snes.vc.3ds.cjs
```

---

## Contributing / Local dev

- Keep I/O out of helpers; they should accept/return `Buffer`s only.
- Prefer small, focused functions with clear parameter validation.
- Add simple Node tests later (no test framework required initially).

---

## Versioning & Publish

1. Update `package.json` (name, version, description, repo).
2. Log in: `npm login`
3. Release: `npm version patch` (or `minor` / `major`)
4. Publish: `npm publish --access public`

---

## License

MIT

---

## Testing locally

This repo includes minimal tests using Node’s built-in runner:

```bash
npm test
```

(Uses `node --test` and `assert`—no external deps.)

---

## Try it from another project (before publish)

### Option A: `npm link` (quick dev)
```bash
# In this repo
npm link

# In your app
npm link node-saveaio   # or the final package name you choose
```

### Option B: pack a tarball and install it
```bash
npm pack     # produces something like mstan-savaieo-0.1.0.tgz
# In your app:
npm i /absolute/path/to/@mstan-saveaio-0.1.0.tgz
```

---

## Publish to npm

1. Pick a **name** in `package.json` (`name`). If you want to `require('node-saveaio')`, set:
   ```json
   { "name": "node-saveaio" }
   ```
   If you prefer a scoped name: `"node-saveaio"` → then you’ll `require('node-saveaio')`.

2. Login and publish:
   ```bash
   npm login
   npm version patch   # or minor/major
   npm publish --access public
   ```

---

## Importing / requiring

- **CommonJS (require):**
  ```js
  // If package.json name is "node-saveaio"
  const saveaio = require('node-saveaio');
  const { SaveFile, swapEndian } = saveaio;
  ```

- **ESM (import):**
  ```js
  import { SaveFile, swapEndian } from 'node-saveaio'; // or 'node-saveaio'
  ```

The package exposes both `import` and `require` entry points (`index.js` for ESM, `index.cjs` for CJS).

---

## Format decoders included

- **GBA**: GameShark `.sps` → raw `.sav` (`decodeGBA_GameSharkSPS`)  
- **GBA**: Pro Action Replay `.xps` → raw `.sav` (`decodeGBA_ProActionReplayXPS`)  
- **N64**: DexDrive `.n64` → raw save (`decodeDexDrive`)  
- **Helpers**: `identifySPS`, `identifyXPS`, `identifyN64` (lightweight heuristics)


### Virtual Console helpers

- **NES (Wii U)** `.ves` → `.sav`  
  - `decodeNES_WiiU_VES(buffer)`: strip VC header, return 8 KiB raw.  
  - `encodeNES_WiiU_VES(buffer)`: experimental minimal header.

- **SNES (3DS)** `.ves` ↔ `.srm`  
  - `decodeSNES_3DS_VES(buffer)`: supports 48‑byte header with magic + checksum.  
  - `encodeSNES_3DS_VES(buffer, presetId)`: experimental builder following community formula (48‑byte header; checksum16 over [4..end]; magic 0xC13586A565CB942C).

- **SNES (Wii U)** `.ves` ↔ `.srm`  
  - `decodeSNES_WiiU_VES(buffer)`: strips small header; returns 2/8/32/64/128 KiB base.  
  - `encodeSNES_WiiU_VES(buffer)`: experimental minimal header.

- **GBA (Wii U)** `data_008_0000.bin` ↔ `.sav`  
  - `decodeGBA_WiiU_BIN(buffer)`: scans for 8/32/64 KiB slot with data‑density heuristic (inspired by SAVE2VC).  
  - `encodeGBA_WiiU_BIN(buffer)`: pass‑through (title metadata not authored).

> Notes: System→VC encoders are *experimental/untested*, matching the status in your original docs. For exact per‑title presets (e.g., SNES preset IDs), supply `presetId` when encoding 3DS SNES.
