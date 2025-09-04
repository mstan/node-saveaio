const test = require("node:test");
const assert = require("node:assert/strict");

const { decodeSNES_WiiU, injectSNES_WiiU } = require("../src/lib.cjs");

// Build a synthetic Wii U .ves container:
//  - 48B header
//  - 32KiB payload (all 0x77)
function makeSNESWiiUContainer() {
  const header = Buffer.alloc(48, 0x11);
  const payload = Buffer.alloc(32 * 1024, 0x77);
  return Buffer.concat([header, payload]);
}

test("SNES Wii U decode returns raw payload", () => {
  const container = makeSNESWiiUContainer();
  const out = decodeSNES_WiiU(container);
  assert.equal(out.length, 32 * 1024);
  assert.ok(out.every(b => b === 0x77));
});

test("SNES Wii U inject throws (stub)", () => {
  const base = Buffer.alloc(32 * 1024, 0x99);
  const container = makeSNESWiiUContainer();
  assert.throws(() => injectSNES_WiiU(base, container));
});
