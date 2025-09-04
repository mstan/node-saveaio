// Wii U VC GBA injection — EXACT SaveAIO behavior:
// result = header(0..0x4080) + payloadNew + originalTail(from 0x4080 + payloadNew.length .. end)

const test = require("node:test");
const assert = require("node:assert/strict");

const { injectGBA_WiiU } = require("../src/lib.cjs");

function makeWiiUContainer(payload, tailBytes, prefixSize = 0x4080) {
  const pre = Buffer.alloc(prefixSize, 0x22);
  Buffer.from("STATRAM0", "ascii").copy(pre, 0x4000); // verify @ 0x4000..0x4008
  const tail = Buffer.from(tailBytes); // keep arbitrary, not trimmed in inject
  return Buffer.concat([pre, payload, tail]);
}

test("WiiU inject uses header + new payload + original tail starting at [0x4080 + newLen]", () => {
  const KB = 1024;

  // source container with an old payload and a distinct tail
  const oldPayload = Buffer.alloc(16 * KB, 0xAA);
  const tailBytes = Buffer.from("TAIL_AFTER_PAYLOAD", "ascii");
  const container = makeWiiUContainer(oldPayload, tailBytes);

  // new payload to inject
  const newPayload = Buffer.alloc(32 * KB, 0xBB);

  const injected = injectGBA_WiiU(container, newPayload);

  // Build expected buffer per exact logic:
  const header = container.subarray(0, 0x4080);
  const tailStart = 0x4080 + newPayload.length;
  const tail = container.subarray(tailStart);
  const expected = Buffer.concat([header, newPayload, tail]);

  assert.equal(injected.length, expected.length, "Injected length must match expected");
  assert.ok(injected.equals(expected), "Injected bytes must match exact splice logic");
});
