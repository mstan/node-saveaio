/* eslint-disable node/no-unpublished-require */
const test   = require("node:test");
const assert = require("node:assert/strict");

const { SaveFileGBA } = require("../src/classes/SaveFileGBA.cjs");
const { calculateCRC, constants } = require("../src/adapters/gba.gs.cjs");

// Build a valid SharkPortSave container from a raw payload + simple second header.
// Returns Buffer (no disk I/O; purely in-memory).
function buildSharkPortSave(raw, {
  title = "Test Title",
  date  = "2025-09-04 12:34",
  notes = "Unit test",
  internalName = "TEST_INTERNAL\0\0\0\0", // exactly 0x10 bytes after padding
  romChecksum = 0x1234,
  romComplimentCheck = 0x56,
  maker = 0x30,
  flag = 0x01,
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

  return Buffer.concat([...h, sec, raw, u32le(crc)]);
}

test("Action Replay (.xps) is explicitly unsupported via class ctor (in-memory buffer)", async () => {
  // Create a valid SharkPortSave container in memory (non-SP GS format)
  const raw = Buffer.alloc(64 * 1024, 0x5A);
  const gsContainer = buildSharkPortSave(raw);

  // Passing an .xps filename should cause SaveFileGBA to throw immediately
  assert.throws(
    () => new SaveFileGBA(gsContainer, "dummy-action-replay.xps"),
    /Action Replay \(.*\.xps\) is unsupported/i,
    "Expected SaveFileGBA to reject .xps files"
  );
});
