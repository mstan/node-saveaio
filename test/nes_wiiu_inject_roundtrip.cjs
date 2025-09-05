// NES Wii U VC inject roundtrip test — EXACT SaveAIO semantics
// Requires: node --test

const test = require("node:test");
const assert = require("node:assert/strict");

const { decodeNES_WiiU, injectNES_WiiU } = require("../src/lib.cjs");

// Build a synthetic Wii U NES container
//  - 32B header (0x11)
//  - 8KiB payload (baseSave)
//  - 128B trailer (0x22) to simulate extra metadata/padding
function makeContainer(baseSave) {
  const header = Buffer.alloc(32, 0x11);
  const trailer = Buffer.alloc(128, 0x22);
  return Buffer.concat([header, baseSave, trailer]);
}

// --- checksum helpers mirrored from adapter ---
function sum16(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s = (s + (buf[i] & 0xFF)) & 0xFFFF;
  return s;
}
function encodeChecksumBytes(sum) {
  // Store as: swap(sum16) then decrement the high byte by 1.
  const hi = (sum >>> 8) & 0xFF;
  const lo = sum & 0xFF;
  const swapped_hi = lo;
  const swapped_lo = hi;
  const dec_hi = (swapped_hi - 1) & 0xFF;
  return Buffer.from([dec_hi, swapped_lo]); // bytes at 0x02..0x03 (LE positions)
}

test("NES Wii U decode extracts raw 8KiB", () => {
  const base = Buffer.alloc(8192, 0x5A);
  const container = makeContainer(base);

  const out = decodeNES_WiiU(container);
  assert.equal(out.length, 8192);
  assert.ok(out.equals(base), "decoded payload must equal original raw save");
});

test("NES Wii U inject preserves header/trailer (except checksum) and replaces payload", () => {
  const oldPayload = Buffer.alloc(8192, 0x33);
  const newPayload = Buffer.alloc(8192, 0x44);

  const container = makeContainer(oldPayload);
  const injected = injectNES_WiiU(newPayload, container);

  // Header: equal except checksum bytes 0x02..0x03
  const origHeader = container.subarray(0, 32);
  const gotHeader  = injected.subarray(0, 32);

  for (let i = 0; i < 32; i++) {
    if (i === 0x02 || i === 0x03) continue; // checksum may change
    assert.equal(
      gotHeader[i], origHeader[i],
      `header byte changed unexpectedly at 0x${i.toString(16).padStart(2, "0")}`
    );
  }

  // Verify checksum bytes are correct for (header with zeroed checksum) + new payload
  const hdrWorking = Buffer.from(origHeader);
  hdrWorking[0x02] = 0x00; hdrWorking[0x03] = 0x00;
  const expectedSum = (sum16(hdrWorking) + sum16(newPayload)) & 0xFFFF;
  const expectedChk = encodeChecksumBytes(expectedSum);
  assert.equal(gotHeader[0x02], expectedChk[0], "checksum high/dec byte mismatch at 0x02");
  assert.equal(gotHeader[0x03], expectedChk[1], "checksum low byte mismatch at 0x03");

  // Payload replaced
  const gotPayload = injected.subarray(32, 32 + 8192);
  assert.ok(gotPayload.equals(newPayload), "payload must equal new save");

  // Trailer untouched
  const gotTrailer = injected.subarray(32 + 8192);
  assert.ok(gotTrailer.every(b => b === 0x22), "trailer must remain unchanged");
});
