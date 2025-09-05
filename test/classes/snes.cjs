// test/classes/snes.cjs
// Requires: node --test

const test = require("node:test");
const assert = require("node:assert/strict");

const { SaveFileSNES, decodeSNES_WiiU } = require("../../src/lib.cjs");

/* ------------------ helpers to build a valid Wii U/3DS SNES VC container ------------------ */

const HEADER_SIZE = 48;
const MAGIC = Buffer.from([0xC1, 0x35, 0x86, 0xA5, 0x65, 0xCB, 0x94, 0x2C]);

function sum16(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s = (s + (buf[i] & 0xFF)) & 0xFFFF;
  return s;
}

function encodeChecksumBytes(sum16val) {
  // store = swap(sum16); then decrement the high byte by 1
  const hi = (sum16val >>> 8) & 0xFF;
  const lo = sum16val & 0xFF;
  const swapped_hi = lo;
  const swapped_lo = hi;
  const dec_hi = (swapped_hi - 1) & 0xFF;
  return Buffer.from([dec_hi, swapped_lo]); // goes at 0x02..0x03 (LE field)
}

function buildValidHeader(payloadLen, presetIdLE /* optional */) {
  const hdr = Buffer.alloc(HEADER_SIZE, 0x00);

  // constants / required fields
  hdr[0x00] = 0x01; hdr[0x01] = 0x00;
  hdr[0x06] = 0x00; hdr[0x07] = 0x00;
  hdr[0x0D] = 0x00; hdr[0x0E] = 0x00; hdr[0x0F] = 0x00;
  MAGIC.copy(hdr, 0x10);
  hdr[0x1A] = 0x00; hdr[0x1B] = 0x00;
  hdr.fill(0x00, 0x20, 0x30);

  // optional fields
  if (Number.isInteger(presetIdLE)) {
    hdr[0x04] = presetIdLE & 0xFF;
    hdr[0x05] = (presetIdLE >>> 8) & 0xFF;
  }
  const sizeKiB = Math.round((payloadLen || 0) / 1024);
  hdr[0x18] = sizeKiB & 0xFF;
  hdr[0x19] = (sizeKiB >>> 8) & 0xFF;

  // zero checksum, compute over header+payload later
  hdr[0x02] = 0x00; hdr[0x03] = 0x00;
  return hdr;
}

function makeValidSNESVCContainer(payloadLen = 32 * 1024, presetIdLE /* optional */) {
  const payload = Buffer.alloc(payloadLen, 0x22);
  const hdr = buildValidHeader(payloadLen, presetIdLE);

  const sum = (sum16(hdr) + sum16(payload)) & 0xFFFF;
  const chk = encodeChecksumBytes(sum);
  chk.copy(hdr, 0x02);

  return Buffer.concat([hdr, payload]);
}

/* ------------------ tests ------------------ */

test("SaveFileSNES autodetects Wii U/3DS VC (unified enum) and decodes payload", async () => {
  const buf = makeValidSNESVCContainer(32 * 1024 /* 32 KiB */);
  const s = new SaveFileSNES(buf);
  await s.init();

  // New unified label
  assert.equal(s.saveFileType, "wii_u_and_3ds_virtual_console");

  // Payload equals adapter decode
  const expected = decodeSNES_WiiU(buf);
  assert.ok(s.getRaw().equals(expected), "decoded payload must match adapter output");
});

test("SaveFileSNES inject replaces payload and keeps container shape", async () => {
  // Original container with known payload pattern (0x22)
  const orig = makeValidSNESVCContainer(32 * 1024);
  const s = new SaveFileSNES(orig);
  await s.init();

  // New payload (different size also OK; header sizeKiB will adjust)
  const newPayload = Buffer.alloc(64 * 1024, 0x44); // 64 KiB to exercise size change
  const injected = s.inject(newPayload);

  // Basic container invariants
  assert.equal(injected.length, HEADER_SIZE + newPayload.length, "container length must be header+payload");
  assert.ok(injected.subarray(0x10, 0x18).equals(MAGIC), "magic must be present at 0x10..0x17");

  // Payload replaced exactly
  const gotPayload = injected.subarray(HEADER_SIZE);
  assert.ok(gotPayload.equals(newPayload), "payload must equal new save data");

  // Header checksum updated to match new payload
  const hdr = Buffer.from(injected.subarray(0, HEADER_SIZE));
  const recompute = encodeChecksumBytes((sum16(hdr.with(0x02, 0x00).with(0x03, 0x00)) + sum16(newPayload)) & 0xFFFF);
  assert.equal(hdr[0x02], recompute[0], "checksum high (stored) must match");
  assert.equal(hdr[0x03], recompute[1], "checksum low  (stored) must match");
});
