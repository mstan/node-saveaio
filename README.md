# node-saveaio

## About
node-saveaio is a toolkit for working with old video game save files. Different consoles, emulators, and cheat devices often wrap the same raw save data in their own special containers, with extra headers or metadata that make the files look incompatible. This project strips away those differences so you can extract the actual save data, normalize it, and inject it back into other formats. In short, it makes your game saves interchangeable across devices that normally wouldn’t “speak the same language.”

Right now, node-saveaio supports multiple consoles and container formats — including NES, SNES, N64, and GBA saves raw saves and also from various virtual consoles like Wii U / 3DS Virtual Console, plus GameShark SP saves (.gsv / .sps). With it, you can do things like:

Take a GameShark SP save (.gsv) → extract the raw SRAM → inject it into a Wii U Virtual Console save so it works on modern emulators.

Start with a Wii U Virtual Console container → pull out the raw save → repackage it as a GameShark SP file to use on original hardware.

Normalize odd-sized raw saves (32 KB, 64 KB, 128 KB) so they match what your game or emulator expects.

Convert N64 DexDrive saves into clean raw files, then generate byte-swapped or word-swapped variants for different emulators, flash cartridges, etc.

```
[ GameShark SP .gsv ]  →  [ RAW Save ]  →  [ Wii U VC .ves ]
        ↑                                   ↓
        └───────────────  interchangeable ────────────────┘
```

This makes it easy to move your progress between original hardware, cheat devices, and modern emulators without losing compatibility.

## Features
Plain-JS toolkit for working with retro **save files**.

- Provides both **low-level buffer utilities** and **high-level class wrappers** for common save formats.
- No TypeScript, no build step, and **no CLI** — just functions and classes you can drop into your Node project.
- Designed to be composable: Buffer in → Buffer out. You control the file I/O.

- **Language:** JavaScript (Node >= 18)
- **Modules:** ESM + CommonJS (`index.js` + `index.cjs`)
- **Tests:** Uses Node’s built-in test runner (`node --test`).
- **Examples:** See the `example/class/` folder for runnable scripts (functional examples coming later).

---

## Supported Operations
If you don't see an operation here, please open an issue.

✔️ Tested & Supported  
🟨 Untested  
❌ Not Supported  
🟦 Special Notes  
🟪 N/A (No conversion required)  

### Nintendo Entertainment System (NES)  
- 3DS Virtual Console  
  - Extract 🟪  
  - Inject 🟪  
- Wii Virtual Console  
  - Extract 🟨  
  - Inject 🟨  
- Wii U Virtual Console  
  - Extract ✔️  
  - Inject 🟨  

### Super Nintendo (SNES)  
- 3DS Virtual Console (New 3DS only)  
  - Extract ✔️  
  - Inject ✔️  
- Wii U Virtual Console  
  - Extract ✔️  
  - Inject ✔️  

### Nintendo 64 (N64)  
_NOTE_: Many N64 emulators and flash cartridges do not use headers, but often require byte and/or word swapping. Try all 4 variants (raw, byteswapped, wordswapped, both).  
  
- Headless/Raw  
  - Byte Swapping ✔️  
  - Word Swapping ✔️  
- DexDrive  
    - Extract ✔️  
    - Inject 🟨 (Untested)  
- Wii Virtual Console  
    - Extract 🟦 (no special headers, see note above)  
    - Inject 🟦 (no special headers, see note above)  
- Wii U Virtual Console  
    - Extract 🟦 (no special headers, see note above)  
    - Inject 🟦  (no special headers, see note above)  
- Switch  
    - Extract 🟦 (no special headers, see note above)  
    - Inject 🟦  (no special headers, see note above)  


### Gameboy [Color] (GB/GBC)  
  - 3DS virtual console  
    - Extract 🟪  
    - Inject 🟪  
### Game Boy Advance (GBA)  
- GameShark  
  - Extract ✔️  
  - Inject 🟨 (Untested)  
- GameShark SP  
  - Extract ✔️  
  - Inject 🟨 (Untested)  
- Action Replay  
  - Extract ❌  
  - Inject ❌  
- 3DS Virtual Console
  - Extract 🟪
  - Inject 🟪
- Wii U Virtual Console  
  - Extract ✔️  
  - Inject ✔️  
### Nintendo DS
- Wii U Virtual Console  
  - Extract 🟪  
  - Inject 🟪  

---

## Install

```
npm i node-saveaio
```

> Until published to npm, clone/extract this repo and `npm link` locally, or import via a relative path.

---

## Usage (Class Interfaces — Recommended)

Classes give you auto-detection, metadata, and convenience methods. Example with **GBA**:

```js
import { readFile, writeFile } from "node:fs/promises";
import { SaveFileGBA } from "node-saveaio";

// Load a containerized Wii U GBA save
const container = await readFile("./in/data_008_0000.bin");

// Detects type automatically (here: wii_u_virtual_console)
const s = new SaveFileGBA(container);

// Extract raw payload
const raw = s.getRaw();
await writeFile("./out/game.raw.sav", raw);

// Normalize to 32 KiB for emulator compatibility (optional)
const norm = s.normalizeSize(32 * 1024);
await writeFile("./out/game.norm.sav", norm);

// Inject raw back into container
const injected = s.injectRaw(norm);
await writeFile("./out/data_008_0000.injected.bin", injected);

console.log(s.getMetadata());
// { type: 'wii_u_virtual_console', size: 32768 }
```

Other classes follow the same pattern:

- `SaveFileNES` (Wii U Virtual Console `.ves`)
- `SaveFileSNES` (3DS / Wii U Virtual Console)
- `SaveFileN64` (DexDrive detection/extract; use buffer utilities for variants)

See the `example/class/` directory for complete runnable scripts:
- `gba_wiiu_extract.js` / `gba_wiiu_inject.js`
- `gba_gamesharksp_extract.js`
- `nes_wiiu_extract.js` / `nes_wiiu_inject.js`
- `snes_wiiu_extract.js`, `snes_3ds_extract.js`
- `n64_dexdrive_extract.js`, `n64_headerless_variants.js`

> **CommonJS** users can `require("node-saveaio")` and access the same class names.

---

## Functional Utilities (Optional)

All class methods are thin wrappers over pure helpers. You can compose these directly if you prefer buffer-first workflows (functional examples will live under `example/functional/` later):

```js
import { readFile, writeFile } from "node:fs/promises";
import { swapEndian, swapWords, trimTrailingZeros } from "node-saveaio";

const raw = await readFile("./in/oot.sav");

// Byte-swap and word-swap manually
const swapped = swapWords(swapEndian(raw, 2), 2);

// Trim trailing 0x00
const trimmed = trimTrailingZeros(swapped);

await writeFile("./out/oot.fixed.sav", trimmed);
```

---

## API

### Class wrappers

- **`SaveFileGBA(buffer)`**
  - `.saveFileType` → `"gameshark_sp" | "gameshark" | "wii_u_virtual_console" | "raw"`
  - `.getRaw()` — return raw payload
  - `.injectRaw(buf)` — reinject payload into container (GS-SP, Wii U supported)
  - `.normalizeSize(bytes=32768)` — trim/pad payload to a target size (default 32 KiB)
  - `.getMetadata()` — returns `{ type, size }`

- **`SaveFileNES(buffer)`**
  - `.saveFileType` → `"wii_u_virtual_console" | "raw"`
  - `.getRaw()` — payload only (header removed, trailer ignored)
  - `.injectRaw(buf)` — preserve header/trailer, replace payload
  - `.getMetadata()`

- **`SaveFileSNES(buffer)`**
  - `.saveFileType` → `"wii_u_virtual_console" | "nintendo_3ds" | "raw"`
  - `.getRaw()` — payload only
  - `.injectRaw(buf)` — **throws** (not implemented by design)
  - `.getMetadata()`

- **`SaveFileN64(buffer)`**
  - `.saveFileType` → `"dexdrive" | "raw"`
  - `.getRaw()` — decoded payload
  - `.getMetadata()`

### Buffer utilities (pure)

- `swapEndian(buffer, bytes=2): Buffer` — swap byte order within chunks  
- `swapWords(buffer, bytes=2): Buffer` — swap adjacent words  
- `trimTrailingZeros(buffer): Buffer`  
- `setSize(buffer, bytes): Buffer` — pad/truncate to exact size  
- `expandToNextPow2(buffer): Buffer`

---

## Testing

```
npm test
```

- Uses Node’s built-in test runner (`node --test`).
- Includes coverage for buffer utilities and container adapters.
- Run in any modern Node (>= 18).

---

## Contributing

- Keep I/O out of helpers; all helpers should accept/return Buffers.
- Favor small, focused functions with parameter validation.
- Add tests for new adapters or buffer ops.
