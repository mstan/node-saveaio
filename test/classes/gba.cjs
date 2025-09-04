const test = require("node:test");
const assert = require("node:assert/strict");

const { SaveFileGBA, decodeGBA_GSSP, decodeGBA_WiiU } = require("../../src/lib.cjs");

// Synthetic builders
function makeGSSPContainer(payloadLen = 32 * 1024) {
  const header = Buffer.alloc(1072, 0xAA);
  Buffer.from("ADVSAVEG", "ascii").copy(header, 0);
  const payload = Buffer.alloc(payloadLen, 0x5A);
  return Buffer.concat([header, payload]);
}
function makeWiiUContainer(payloadLen = 32 * 1024) {
  const header = Buffer.alloc(16512, 0x00);
  Buffer.from("STATRAM0", "ascii").copy(header, 0x4000);
  const payload = Buffer.alloc(payloadLen, 0x77);
  return Buffer.concat([header, payload]);
}

test("SaveFileGBA autodetects GSSP", async () => {
  const buf = makeGSSPContainer();
  const s = new SaveFileGBA(buf);
  assert.equal(s.saveFileType, "gameshark_sp");
  assert.ok(s.getRaw().equals(decodeGBA_GSSP(buf)));
});

test("SaveFileGBA autodetects WiiU", async () => {
  const buf = makeWiiUContainer();
  const s = new SaveFileGBA(buf);
  assert.equal(s.saveFileType, "wii_u_virtual_console");
  assert.ok(s.getRaw().equals(decodeGBA_WiiU(buf)));
});
