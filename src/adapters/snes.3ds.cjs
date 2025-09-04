// SNES 3DS Virtual Console adapter
// Uses the same structure as Wii U VC (48-byte header).
// Delegates to Wii U implementation. Reinjection throws as well.

const {
  identifySNES_WiiU,
  decodeSNES_WiiU,
  injectSNES_WiiU,
} = require("./snes.wiiu.cjs");

function identifySNES_3DS(buf) {
  return identifySNES_WiiU(buf);
}

function decodeSNES_3DS(container) {
  return decodeSNES_WiiU(container);
}

function injectSNES_3DS() {
  return injectSNES_WiiU();
}

module.exports = {
  identifySNES_3DS,
  decodeSNES_3DS,
  injectSNES_3DS,
};
