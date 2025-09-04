// src/adapters/inject.cjs
// Generic “inject raw payload into existing container” helpers.
// Supported containers (auto-detected):
//   - SNES (3DS) .ves (48B header; checksum recomputed)
//   - SNES (Wii U) .ves (small header; payload tail)
//   - GBA  (Wii U) data_008_0000.bin (payload = longest non-padding run)
//
// Exports:
//   - detectVCType(container) -> 'snes-3ds' | 'snes-wiiu' | 'gba-wiiu' | 'unknown'
//   - injectVC(container, base) -> Buffer (auto routes)
//   - injectSNES_3DS_VES(container, base) -> Buffer
//   - injectSNES_WiiU_VES(container, base) -> Buffer
//   - injectGBA_WiiU_BIN(container, base) -> Buffer

const { identifySNES_3DS_VES } = require("./snes.3ds.ves.cjs");
const { identifySNES_WiiU_VES } = require("./snes.wiiu.ves.cjs");
const { identifyGBA_WiiU_BIN }  = require("./gba.wiiu.bin.cjs");

const KB = 1024;
const SNES_SRAM_SIZES = [2*KB, 8*KB, 32*KB, 64*KB, 128*KB];
const GBA_SIZES = [8*KB, 32*KB, 64*KB];

// ---------- tiny utils ----------
function sliceSafe(buf, start, len) {
  if (start < 0 || len < 0 || start + len > buf.length) return null;
  return Buffer.from(buf.subarray(start, start + len));
}
function isAll(buf, b) { for (let i=0;i<buf.length;i++) if (buf[i]!==b) return false; return true; }
function notAll00orFF(buf) { return !isAll(buf,0x00) && !isAll(buf,0xFF); }

// ---------- GBA (Wii U) BIN ----------
function findLongestNonPaddingRun(buf) {
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let i = 0; i < buf.length; i++) {
    const isPad = (buf[i] === 0x00 || buf[i] === 0xFF);
    if (!isPad) {
      if (curLen === 0) curStart = i;
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curLen = 0;
    }
  }
  return bestLen > 0 ? { start: bestStart, len: bestLen } : null;
}

function injectGBA_WiiU_BIN(container, base) {
  if (!Buffer.isBuffer(container)) throw new TypeError("injectGBA_WiiU_BIN: container must be Buffer");
  if (!Buffer.isBuffer(base)) throw new TypeError("injectGBA_WiiU_BIN: base must be Buffer");
  if (!GBA_SIZES.includes(base.length)) throw new Error("GBA base must be 8/32/64 KiB");
  if (container.length === base.length) return Buffer.from(base);

  const run = findLongestNonPaddingRun(container);
  if (!run) throw new Error("injectGBA_WiiU_BIN: payload span not found in container");
  if (run.len !== base.length) {
    throw new Error(`injectGBA_WiiU_BIN: size mismatch; container payload=${run.len}, base=${base.length}`);
  }
  const head = sliceSafe(container, 0, run.start);
  const tail = sliceSafe(container, run.start + run.len, container.length - (run.start + run.len));
  if (!head || !tail) throw new Error("injectGBA_WiiU_BIN: internal span slicing failed");
  return Buffer.concat([head, base, tail]);
}

// ---------- SNES (Wii U) .ves ----------
const MAX_SMALL_HDR = 128;
function injectSNES_WiiU_VES(container, base) {
  if (!Buffer.isBuffer(container)) throw new TypeError("injectSNES_WiiU_VES: container must be Buffer");
  if (!Buffer.isBuffer(base)) throw new TypeError("injectSNES_WiiU_VES: base must be Buffer");
  if (!SNES_SRAM_SIZES.includes(base.length)) throw new Error("SNES base must be 2/8/32/64/128 KiB");

  // Case A: total = header + base (small header)
  const hdr = container.length - base.length;
  if (hdr >= 0 && hdr <= MAX_SMALL_HDR) {
    const head = sliceSafe(container, 0, hdr);
    if (!head) throw new Error("injectSNES_WiiU_VES: bad head slice");
    return Buffer.concat([head, base]);
  }
  // Case B: payload at end — replace last base.length bytes
  if (container.length >= base.length) {
    const head = sliceSafe(container, 0, container.length - base.length);
    if (!head) throw new Error("injectSNES_WiiU_VES: bad head slice (tail replace)");
    return Buffer.concat([head, base]);
  }
  throw new Error("injectSNES_WiiU_VES: could not place base payload in container");
}

// ---------- SNES (3DS) .ves (48B header + checksum) ----------
const HLEN = 48;
const MAGIC = Buffer.from([0xC1,0x35,0x86,0xA5,0x65,0xCB,0x94,0x2C]);
function checksum16BE(buf, start=0, end=buf.length) {
  let sum = 0;
  for (let i = start; i < end; i++) sum = (sum + buf[i]) & 0xFFFF;
  return sum;
}
function injectSNES_3DS_VES(container, base) {
  if (!Buffer.isBuffer(container)) throw new TypeError("injectSNES_3DS_VES: container must be Buffer");
  if (!Buffer.isBuffer(base)) throw new TypeError("injectSNES_3DS_VES: base must be Buffer");
  if (!SNES_SRAM_SIZES.includes(base.length)) throw new Error("SNES base must be 2/8/32/64/128 KiB");

  if (container.length < HLEN) throw new Error("injectSNES_3DS_VES: container too small");
  const head = Buffer.from(container.subarray(0, HLEN));
  const payloadLen = container.length - HLEN;
  if (payloadLen !== base.length) {
    throw new Error(`injectSNES_3DS_VES: size mismatch; container payload=${payloadLen}, base=${base.length}`);
  }
  // Optional sanity check
  if (!(head[0] === 0x01 && head.subarray(16, 24).equals(MAGIC))) {
    // Not strictly a 3DS .ves header—but we still proceed.
  }
  const sum = checksum16BE(Buffer.concat([head.subarray(4, HLEN), base]));
  head[2] = (sum >> 8) & 0xFF;
  head[3] = sum & 0xFF;
  return Buffer.concat([head, base]);
}

// ---------- detection + router ----------
function detectVCType(container) {
  if (!Buffer.isBuffer(container)) throw new TypeError("detectVCType: container must be Buffer");
  if (identifySNES_3DS_VES(container)) return "snes-3ds";
  if (identifySNES_WiiU_VES(container)) return "snes-wiiu";
  if (identifyGBA_WiiU_BIN(container))  return "gba-wiiu";
  return "unknown";
}

function injectVC(container, base) {
  const kind = detectVCType(container);
  switch (kind) {
    case "snes-3ds": return injectSNES_3DS_VES(container, base);
    case "snes-wiiu": return injectSNES_WiiU_VES(container, base);
    case "gba-wiiu":  return injectGBA_WiiU_BIN(container, base);
    default:
      throw new Error("injectVC: unsupported/unknown container format");
  }
}

module.exports = {
  // generic
  detectVCType,
  injectVC,
  // specific
  injectSNES_3DS_VES,
  injectSNES_WiiU_VES,
  injectGBA_WiiU_BIN,
};
