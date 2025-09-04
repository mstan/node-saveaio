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

test("NES Wii U decode extracts raw 8KiB", () => {
  const base = Buffer.alloc(8192, 0x5A);
  const container = makeContainer(base);

  const out = decodeNES_WiiU(container);
  assert.equal(out.length, 8192);
  assert.ok(out.equals(base), "decoded payload must equal original raw save");
});

test("NES Wii U inject preserves header and trailer, replaces payload", () => {
  const oldPayload = Buffer.alloc(8192, 0x33);
  const newPayload = Buffer.alloc(8192, 0x44);

  const container = makeContainer(oldPayload);
  const injected = injectNES_WiiU(newPayload, container);

  // Header untouched
  assert.deepEqual([...injected.subarray(0, 32)], new Array(32).fill(0x11));

  // Payload replaced
  const gotPayload = injected.subarray(32, 32 + 8192);
  assert.ok(gotPayload.equals(newPayload), "payload must equal new save");

  // Trailer untouched
  const gotTrailer = injected.subarray(32 + 8192);
  assert.ok(gotTrailer.every(b => b === 0x22), "trailer must remain unchanged");
});
