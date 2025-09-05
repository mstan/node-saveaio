/* eslint-disable node/no-unpublished-require */
const test   = require("node:test");
const assert = require("node:assert/strict");

const {
  SaveFileN64,
  // public helpers from lib to cross-check behavior
  identifyN64_DexDrive,
  decodeDexDrive,
  encodeDexDrive,
  swapEndian,
  swapWords,
} = require("../../src/lib.cjs");

/* ------------------ synthetic DexDrive builder ------------------ */
// Constants mirrored from adapter
const DEX_HDR_TEXT  = "123-456-STD";
const DEX_SAVE_START = 0x1040; // 4160

function makeDexDriveContainer(payloadLen = 32 * 1024) {
  // Header: 0x1040 bytes, with ASCII "123-456-STD" at [0..11)
  const header = Buffer.alloc(DEX_SAVE_START, 0x00);
  Buffer.from(DEX_HDR_TEXT, "ascii").copy(header, 0);

  // Payload: fill with a simple ascending pattern so swaps are testable
  const payload = Buffer.alloc(payloadLen);
  for (let i = 0; i < payload.length; i++) payload[i] = i & 0xFF;

  return Buffer.concat([header, payload]);
}

function mutatePayload(len) {
  const p = Buffer.alloc(len);
  for (let i = 0; i < len; i++) p[i] = (0xA0 + i) & 0xFF;
  return p;
}

/* ------------------ tests ------------------ */

test("N64 DexDrive: identify + extract via SaveFileN64", async () => {
  const container = makeDexDriveContainer(32 * 1024);

  assert.equal(identifyN64_DexDrive(container), true, "identifyN64_DexDrive should be true");

  const s = new SaveFileN64(container);
  const type = s.detect();
  assert.equal(type, "dexdrive", "class should detect 'dexdrive'");
  const raw = s.extractRaw();

  const rawViaAdapter = decodeDexDrive(container);
  assert.ok(raw.equals(rawViaAdapter), "class extract should equal adapter decode");
  assert.equal(raw.length, 32 * 1024, "raw payload length should match requested");
});

test("N64 DexDrive: injectRaw preserves header and replaces payload", async () => {
  const container = makeDexDriveContainer(16 * 1024);
  const s = new SaveFileN64(container);
  assert.equal(s.detect(), "dexdrive");

  const newPayload = mutatePayload(24 * 1024);
  const injected = s.injectRaw(newPayload);

  // Header preserved
  assert.ok(container.subarray(0, DEX_SAVE_START).equals(injected.subarray(0, DEX_SAVE_START)),
    "injected must preserve original header [0..0x1040)");

  // Payload replaced (no tail concatenation)
  assert.equal(injected.length, DEX_SAVE_START + newPayload.length,
    "injected container length must be header + new payload length");
  assert.ok(injected.subarray(DEX_SAVE_START).equals(newPayload),
    "injected payload must equal provided new payload");
});

test("N64 DexDrive: exportVariants returns raw/byte-swap/word-swap/both", async () => {
  const container = makeDexDriveContainer(8 * 1024);
  const s = new SaveFileN64(container);
  assert.equal(s.detect(), "dexdrive");

  const { raw, endian, words, both } = s.exportVariants();

  const expEndian = swapEndian(raw, 2);
  const expWords  = swapWords(raw, 2);
  const expBoth   = swapWords(expEndian, 2);

  assert.ok(endian.equals(expEndian), "endian variant should match swapEndian(raw,2)");
  assert.ok(words.equals(expWords),   "words variant should match swapWords(raw,2)");
  assert.ok(both.equals(expBoth),     "both variant should match swapWords(swapEndian(raw,2),2)");
});

test("N64 DexDrive: injectVariants returns four DexDrive containers with correct payloads", async () => {
  const base = makeDexDriveContainer(4 * 1024);
  const s = new SaveFileN64(base);
  assert.equal(s.detect(), "dexdrive");

  // Make a distinct base payload to transform
  const newRaw = mutatePayload(4 * 1024);
  const injected = s.injectVariants(newRaw);

  // Decode each container and cross-check payload transforms
  const gotRaw   = decodeDexDrive(injected.raw);
  const gotEndian= decodeDexDrive(injected.endian);
  const gotWords = decodeDexDrive(injected.words);
  const gotBoth  = decodeDexDrive(injected.both);

  const expEndian = swapEndian(newRaw, 2);
  const expWords  = swapWords(newRaw, 2);
  const expBoth   = swapWords(expEndian, 2);

  assert.ok(gotRaw.equals(newRaw),        "injectVariants.raw payload should equal newRaw");
  assert.ok(gotEndian.equals(expEndian),  "injectVariants.endian payload should be byte-swapped");
  assert.ok(gotWords.equals(expWords),    "injectVariants.words payload should be word-swapped");
  assert.ok(gotBoth.equals(expBoth),      "injectVariants.both payload should be byte+word swapped");

  // All injected headers must match the original header
  const hdr = base.subarray(0, DEX_SAVE_START);
  for (const [key, buf] of Object.entries(injected)) {
    assert.ok(buf.subarray(0, DEX_SAVE_START).equals(hdr), `header must be preserved for variant '${key}'`);
  }
});
