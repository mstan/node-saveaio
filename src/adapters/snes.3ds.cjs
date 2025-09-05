// SNES 3DS Virtual Console adapter
// Delegates to the Wii U implementation (same 48-byte header, magic, checksum).

const {
  identifySNES_WiiU,
  decodeSNES_WiiU,
  injectSNES_WiiU,
} = require("./snes.wiiu.cjs");

function identifySNES_3DS(buf) {
  // 3DS uses the same MAGIC at 0x10..0x17; Wii U identify is sufficient
  return identifySNES_WiiU(buf);
}

function decodeSNES_3DS(container) {
  return decodeSNES_WiiU(container);
}

function injectSNES_3DS(originalContainer, payload, opts = {}) {
  // Forward args so checksum/preset/sizeKiB all work the same way
  return injectSNES_WiiU(originalContainer, payload, opts);
}

module.exports = {
  identifySNES_3DS,
  decodeSNES_3DS,
  injectSNES_3DS,
};
