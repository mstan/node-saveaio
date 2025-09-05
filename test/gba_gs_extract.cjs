/* eslint-disable node/no-unpublished-require */
const test   = require("node:test");
const assert = require("node:assert/strict");

const { SaveFileGBA } = require("../src/classes/SaveFileGBA.cjs");
const { identifyGBA_GS, calculateCRC, constants } = require("../src/adapters/gba.gs.cjs");

// Helper: build a valid SharkPortSave container from a raw payload + simple second header.
// Returns Buffer.
function buildSharkPortSave(raw, {
  title = "Test Title",
  date  = "2025-09-04 12:34",
  notes = "Unit test",
  internalName = "TEST_INTERNAL\0\0\0\0", // exactly 0x10 bytes after padding
  romChecksum = 0x1234,
  romComplimentCheck = 0x56,
  maker = 0x30,
  flag = 0x01
} = {}) {
  if (!Buffer.isBuffer(raw)) throw new TypeError("raw Buffer required");

  const ascii = (s) => Buffer.from(s, "ascii");
  const u32le = (n) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n >>> 0, 0);
    return b;
  };
  const u16le = (n) => {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n & 0xFFFF, 0);
    return b;
  };
  const u8 = (n) => Buffer.from([n & 0xFF]);

  // First header: [len][text][platform][len title][title][len date][date][len notes][notes][len(sec+raw)]
  const h = [];
  h.push(u32le(constants.GS_TEXT.length));
  h.push(ascii(constants.GS_TEXT));
  h.push(u32le(0x000f0000)); // GBA

  h.push(u32le(title.length)); h.push(ascii(title));
  h.push(u32le(date.length));  h.push(ascii(date));
  h.push(u32le(notes.length)); h.push(ascii(notes));

  // Second header 0x1C
  const sec = Buffer.alloc(constants.SECOND_HEADER_LENGTH, 0x00);
  ascii(internalName.padEnd(0x10, "\0")).copy(sec, 0);
  u16le(romChecksum).copy(sec, 0x10);
  u8(romComplimentCheck).copy(sec, 0x12);
  u8(maker).copy(sec, 0x13);
  u8(flag).copy(sec, 0x14);

  const secPlusRawLen = sec.length + raw.length;
  h.push(u32le(secPlusRawLen));

  // CRC over [sec][raw]
  const secRaw = Buffer.concat([sec, raw]);
  const crc = calculateCRC(secRaw);

  return Buffer.concat([
    ...h,
    sec,
    raw,
    u32le(crc)
  ]);
}

test("SharkPortSave: identify + extract via SaveFileGBA", async () => {
  const raw = Buffer.alloc(64 * 1024, 0xAA); // 64 KiB dummy save
  // sprinkle some non-AA to make density non-trivial (not required)
  raw.writeUInt32LE(0xDEADBEEF >>> 0, 0x100);
  raw.writeUInt32LE(0xB16B00B5 >>> 0, 0x200);

  const gs = buildSharkPortSave(raw);

  assert.equal(identifyGBA_GS(gs), true, "identify should be true for SharkPortSave");

  const s = new SaveFileGBA(gs);
  await s.init();
  assert.equal(s.saveFileType, "gameshark", "should classify as non-SP GameShark");
  const out = s.getRaw();

  assert.equal(out.length, raw.length, "extracted raw length should match");
  assert.ok(out.equals(raw), "extracted raw should equal original payload");
});

test("SharkPortSave: corrupted length should throw during parse", () => {
  const raw = Buffer.alloc(32 * 1024, 0x22);
  const good = buildSharkPortSave(raw);

  // Corrupt sec+raw length (make it smaller)
  const corrupted = Buffer.from(good);
  // Find the offset of that u32: after
  // [4 + 13 + 4] + [4+title] + [4+date] + [4+notes]
  const title = "A";
  const date  = "B";
  const notes = "C";

  // Rebuild with known small strings to compute offsets exactly:
  const withShorts = buildSharkPortSave(raw, { title, date, notes });
  const textLen = 4 + constants.GS_TEXT.length + 4;
  const offAfterText = textLen;
  const offTitle = offAfterText + 4 + title.length;
  const offDate  = offTitle     + 4 + date.length;
  const offNotes = offDate      + 4 + notes.length;
  const offSecRawLen = offNotes; // here lives the u32 for sec+raw length

  // Now corrupt that position in our first buffer:
  // (We’ll assume both builds have same offset layout because we used same title/date/notes)
  const corruptBuf = buildSharkPortSave(raw, { title, date, notes });
  corruptBuf.writeUInt32LE(0x10, offSecRawLen); // ridiculously small, invalid

  const s = new SaveFileGBA(corruptBuf);
  assert.throws(() => s.getRaw(), /invalid payload length|truncated/i);
});
