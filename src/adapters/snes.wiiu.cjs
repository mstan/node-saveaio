// SNES Wii U Virtual Console adapter
// Based on SaveAIO: strip 48-byte header (0x30) and return payload.
// Reinjection is NOT implemented — checksum/integrity required.

const HEADER_SIZE = 48;

function identifySNES_WiiU(buf) {
  return Buffer.isBuffer(buf) && buf.length > HEADER_SIZE;
}

function decodeSNES_WiiU(container) {
  if (!Buffer.isBuffer(container)) {
    throw new TypeError("decodeSNES_WiiU: Buffer required");
  }
  if (container.length <= HEADER_SIZE) {
    throw new Error("Container too small for SNES Wii U VC save");
  }
  return Buffer.from(container.subarray(HEADER_SIZE));
}

function injectSNES_WiiU() {
  throw new Error(
    "SNES Wii U reinjection not implemented (checksum/integrity fails)."
  );
}

module.exports = {
  identifySNES_WiiU,
  decodeSNES_WiiU,
  injectSNES_WiiU,
};
