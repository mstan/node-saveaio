/* eslint-disable node/no-unpublished-require */
const test   = require("node:test");
const assert = require("node:assert/strict");

const { SaveFileGBA, decodeGBA_GSSP, decodeGBA_WiiU } = require("../../src/lib.cjs");

/* ------------------ synthetic builders ------------------ */
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

// Minimal SharkPortSave header (enough for identifyGBA_GS to return true).
// Layout: [u32 len=13]["SharkPortSave"][u32 platform=0x000f0000]
function makeMinimalSharkPortSaveHeader() {
  const u32 = (n) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n >>> 0, 0);
    return b;
  };
  const tag = Buffer.from("SharkPortSave", "ascii"); // 13 bytes
  const plat = 0x000f0000; // GBA

  return Buffer.concat([u32(tag.length), tag, u32(plat)]);
}

/* ------------------ tests ------------------ */

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

test("SaveFileGBA rejects Action Replay (.xps) via filename guard", async () => {
  // Build a minimal but valid-looking SharkPortSave header in memory.
  const minimalGS = makeMinimalSharkPortSaveHeader();

  // Passing a .xps filename must throw immediately per current policy.
  assert.throws(
    () => new SaveFileGBA(minimalGS, "dummy-action-replay.xps"),
    /Action Replay \(.*\.xps\) is unsupported/i,
    "Expected SaveFileGBA to reject .xps files"
  );
});
