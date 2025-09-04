const test = require("node:test");
const assert = require("node:assert/strict");

const { SaveFileNES, decodeNES_WiiU } = require("../../src/lib.cjs");

function makeWiiUContainer(payloadLen = 8 * 1024) {
  const header = Buffer.alloc(32, 0x00);
  const payload = Buffer.alloc(payloadLen, 0x11);
  return Buffer.concat([header, payload]);
}

test("SaveFileNES autodetects WiiU", async () => {
  const buf = makeWiiUContainer();
  const s = new SaveFileNES(buf);
  await s.init();
  assert.equal(s.saveFileType, "wii_u_virtual_console");
  assert.ok(s.getRaw().equals(decodeNES_WiiU(buf)));
});
