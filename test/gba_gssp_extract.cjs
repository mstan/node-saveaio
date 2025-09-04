// GameShark SP (ADVSAVEG) extraction — EXACT SaveAIO behavior:
// decode returns container.slice(1072, container.length) with NO trimming.

const test = require("node:test");
const assert = require("node:assert/strict");

const { decodeGBA_GSSP } = require("../src/lib.cjs");

// Build a synthetic GS-SP container:
//  - header[0..1072), with "ADVSAVEG" at [0..8)
//  - payload (e.g., 32 KiB)
//  - tail zeros (these MUST be preserved by decoder)
function makeGSSPContainer(payload, tailZeros = 0) {
  const header = Buffer.alloc(1072, 0xAA);
  Buffer.from("ADVSAVEG", "ascii").copy(header, 0); // signature at [0..8)
  const tail = Buffer.alloc(tailZeros, 0x00);
  return Buffer.concat([header, payload, tail]);
}

test("GSSP decode returns raw slice 1072..end (no trimming)", () => {
  const KB = 1024;
  const payload = Buffer.alloc(32 * KB, 0x5A); // 32 KiB
  const tailZeros = 512; // trailing zeros MUST remain in result
  const container = makeGSSPContainer(payload, tailZeros);

  const out = decodeGBA_GSSP(container);
  const expected = container.subarray(1072); // EXACT SaveAIO behavior

  assert.equal(out.length, expected.length);
  assert.ok(out.equals(expected), "GSSP decode must equal container.slice(1072)");
});
