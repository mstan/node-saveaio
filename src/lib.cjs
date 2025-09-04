// Central export surface for node-saveaio (CommonJS)

const { SaveFile } = require("./core/SaveFile.cjs");

// Buffer utils
const { swapEndian } = require("./buffers/endian.cjs");
const { swapWords } = require("./buffers/words.cjs");
const { trimTrailingZeros } = require("./buffers/whitespace.cjs");
const { setSize, expandToNextPow2 } = require("./buffers/size.cjs");

// N64 DexDrive
const {
  decodeDexDrive,
  encodeDexDrive,
  identifyN64_DexDrive,
} = require("./adapters/n64.dexdrive.cjs");

// GBA
const {
  identifyGBA_GSSP,
  decodeGBA_GSSP,
  injectGBA_GSSP,
} = require("./adapters/gba.gssp.cjs");

const {
  identifyGBA_GS,
  decodeGBA_GS,
} = require("./adapters/gba.gs.cjs");

const {
  identifyGBA_WiiU,
  decodeGBA_WiiU,
  injectGBA_WiiU,
} = require("./adapters/gba.wiiu.cjs");

// NES
const {
  identifyNES_WiiU,
  decodeNES_WiiU,
  injectNES_WiiU,
} = require("./adapters/nes.wiiu.cjs");

// SNES
const {
  identifySNES_WiiU,
  decodeSNES_WiiU,
  injectSNES_WiiU,
} = require("./adapters/snes.wiiu.cjs");

const {
  identifySNES_3DS,
  decodeSNES_3DS,
  injectSNES_3DS,
} = require("./adapters/snes.3ds.cjs");

// OO wrappers
const { SaveFileGBA } = require("./classes/SaveFileGBA.cjs");
const { SaveFileNES } = require("./classes/SaveFileNES.cjs");
const { SaveFileSNES } = require("./classes/SaveFileSNES.cjs");
const { SaveFileN64 } = require("./classes/SaveFileN64.cjs");

module.exports = {
  // Base
  SaveFile,

  // Buffer utils
  swapEndian,
  swapWords,
  trimTrailingZeros,
  setSize,
  expandToNextPow2,

  // N64
  decodeDexDrive,
  encodeDexDrive,
  identifyN64_DexDrive,

  // GBA
  identifyGBA_GSSP,
  decodeGBA_GSSP,
  injectGBA_GSSP,
  identifyGBA_GS,
  decodeGBA_GS,
  identifyGBA_WiiU,
  decodeGBA_WiiU,
  injectGBA_WiiU,

  // NES
  identifyNES_WiiU,
  decodeNES_WiiU,
  injectNES_WiiU,

  // SNES
  identifySNES_WiiU,
  decodeSNES_WiiU,
  injectSNES_WiiU,
  identifySNES_3DS,
  decodeSNES_3DS,
  injectSNES_3DS,

  // OO
  SaveFileGBA,
  SaveFileNES,
  SaveFileSNES,
  SaveFileN64,
};
