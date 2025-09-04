const test = require("node:test");
const assert = require("node:assert/strict");

const { SaveFileSNES, decodeSNES_WiiU } = require("../../src/lib.cjs");

function makeWiiUContainer(payloadLen = 32 * 1024) {
  const header = Buffer.alloc(48, 0x00);
  const payload = Buffer.alloc(payloadLen, 0x22);
  return Buffer.concat([header, payload]);
}

test("SaveFileSNES autodetects WiiU", async () => {
  const buf = makeWiiUContainer();
  const s = new SaveFileSNES(buf);
  await s.init();
  assert.equal(s.saveFileType, "wii_u_virtual_console");
  assert.ok(s.getRaw().equals(decodeSNES_WiiU(buf)));
});

test("SaveFileSNES inject throws (stubbed)", async () => {
  const buf = makeWiiUContainer();
  const s = new SaveFileSNES(buf);
  await s.init();
  assert.throws(() => s.inject(Buffer.alloc(32 * 1024, 0x33)), /not implemented/i);
});
