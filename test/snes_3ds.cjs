const test = require("node:test");
const assert = require("node:assert/strict");

const { decodeSNES_3DS, injectSNES_3DS } = require("../src/lib.cjs");

// Build a synthetic 3DS .ves container:
//  - 48B header
//  - 32KiB payload (all 0xAB)
function makeSNES3DSContainer() {
  const header = Buffer.alloc(48, 0x22);
  const payload = Buffer.alloc(32 * 1024, 0xAB);
  return Buffer.concat([header, payload]);
}

test("SNES 3DS decode returns raw payload", () => {
  const container = makeSNES3DSContainer();
  const out = decodeSNES_3DS(container);
  assert.equal(out.length, 32 * 1024);
  assert.ok(out.every(b => b === 0xAB));
});

test("SNES 3DS inject throws (stub)", () => {
  const base = Buffer.alloc(32 * 1024, 0xCC);
  const container = makeSNES3DSContainer();
  assert.throws(() => injectSNES_3DS(base, container));
});
