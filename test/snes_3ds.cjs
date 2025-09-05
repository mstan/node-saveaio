/* eslint-disable node/no-unpublished-require */
const test   = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

const { decodeSNES_3DS, injectSNES_3DS } = require("../src/lib.cjs");

// Real SNES 3DS VC .ves (Super Mario World)
const REAL_VES = join(__dirname, "fixtures", "KTR-UAAE.ves");

// Wii U/3DS SNES .ves header is always 48 bytes
const HEADER_SIZE = 48;

/** Assert two headers are equal, ignoring checksum (0x02..0x03) and sizeKiB (0x18..0x19). */
function assertHeadersEqualExcept(hA, hB) {
  assert.equal(hA.length >= HEADER_SIZE && hB.length >= HEADER_SIZE, true, "both buffers must be >= 48 bytes");
  for (let i = 0; i < HEADER_SIZE; i++) {
    if (i === 0x02 || i === 0x03 || i === 0x18 || i === 0x19) continue; // ignore checksum + sizeKiB
    assert.equal(
      hA[i], hB[i],
      `header differs at 0x${i.toString(16).padStart(2, "0")} (got 0x${hA[i]?.toString(16).padStart(2, "0")}, expected 0x${hB[i]?.toString(16).padStart(2, "0")})`
    );
  }
}

test("SNES 3DS decode extracts payload from real .ves", async () => {
  const container = await readFile(REAL_VES);
  const raw = decodeSNES_3DS(container);

  assert.ok(Buffer.isBuffer(raw), "decode must return a Buffer");
  assert.ok(raw.length > 0, "raw payload must not be empty");
});

test("SNES 3DS inject replaces payload and preserves header (except checksum & sizeKiB)", async () => {
  const container = await readFile(REAL_VES);
  const origRaw = decodeSNES_3DS(container);

  // New payload same size; sizeKiB might still change from original (if it was zero/missing)
  const newPayload = Buffer.alloc(origRaw.length, 0xCC);

  const injected = injectSNES_3DS(container, newPayload);

  // Header equality except checksum (0x02..0x03) and sizeKiB (0x18..0x19)
  assertHeadersEqualExcept(
    injected.subarray(0, HEADER_SIZE),
    container.subarray(0, HEADER_SIZE)
  );

  // Payload should be exactly our injected buffer
  const outRaw = decodeSNES_3DS(injected);
  assert.equal(outRaw.length, newPayload.length, "payload length should be unchanged");
  assert.ok(outRaw.equals(newPayload), "payload must equal injected buffer");
});
