// Wii U VC GBA extraction — EXACT SaveAIO behavior:
//  - verify "STATRAM0" at [0x4000..0x4008)
//  - decode trims only trailing 0x00 from the CONTAINER, then returns slice [0x4080..trimmedEnd]

const test = require("node:test");
const assert = require("node:assert/strict");

const { decodeGBA_WiiU } = require("../src/lib.cjs");

function makeWiiUContainer(payload, tailZeros = 0, prefixSize = 0x4080) {
  const pre = Buffer.alloc(prefixSize, 0x11);
  Buffer.from("STATRAM0", "ascii").copy(pre, 0x4000); // verification @ 0x4000..0x4008
  const tail = Buffer.alloc(tailZeros, 0x00); // ONLY zeros are trimmed by decoder
  return Buffer.concat([pre, payload, tail]);
}

test("WiiU decode trims only trailing zeros then slices [0x4080..end]", () => {
  const KB = 1024;
  const payload = Buffer.alloc(32 * KB, 0x33);
  const tailZeros = 4096; // should be trimmed away
  const container = makeWiiUContainer(payload, tailZeros);

  const out = decodeGBA_WiiU(container);

  assert.equal(out.length, payload.length, "Decoded length must equal payload length");
  assert.ok(out.equals(payload), "Decoded data must equal original payload");
});
