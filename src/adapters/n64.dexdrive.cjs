// src/adapters/n64.dexdrive.cjs
// Nintendo 64 DexDrive extractor/injector
// EXACT port of your SaveFileNintendo64._parseDexDriveSave logic:
//  - Verify ASCII "123-456-STD" at [0..11)
//  - Comments live in [0x40..0x1000) (not returned; no heuristics)
//  - Payload starts at 0x1040 (4160) and runs to ORIGINAL end (no trimming)
//  - Inject = header[0..0x1040) + payload  (no tail concatenation)

const DEX_HDR_START = 0x0000;
const DEX_HDR_END   = 0x000B; // exclusive (11)
const DEX_HDR_TEXT  = "123-456-STD";

const DEX_COMMENTS_START = 0x0040; // 64
const DEX_COMMENTS_END   = 0x1000; // 4096
const DEX_SAVE_START     = 0x1040; // 4160

function asciiAt(buf, start, end) {
  return Buffer.from(buf.subarray(start, end)).toString("ascii");
}

function identifyN64_DexDrive(buf) {
  if (!Buffer.isBuffer(buf)) throw new TypeError("identifyN64_DexDrive: Buffer required");
  if (buf.length < DEX_SAVE_START) return false;
  return asciiAt(buf, DEX_HDR_START, DEX_HDR_END) === DEX_HDR_TEXT;
}

function decodeDexDrive(container) {
  if (!Buffer.isBuffer(container)) throw new TypeError("decodeDexDrive: Buffer required");
  if (!identifyN64_DexDrive(container)) {
    throw new Error("Not a valid DexDrive N64 save (header '123-456-STD' missing).");
  }
  if (container.length <= DEX_SAVE_START) {
    throw new Error("DexDrive container too small; no payload.");
  }
  // EXACT: slice from 0x1040 to ORIGINAL end (no trimming)
  return Buffer.from(container.subarray(DEX_SAVE_START, container.length));
}

/** Build a DexDrive container from a raw N64 save by borrowing header from a source DexDrive.
 *  EXACT analog to your exportDexDrive* intent:
 *    result = sourceHeader[0..0x1040) + payload
 */
function encodeDexDrive(sourceContainer, payload) {
  if (!Buffer.isBuffer(sourceContainer)) throw new TypeError("encodeDexDrive: sourceContainer Buffer required");
  if (!Buffer.isBuffer(payload))         throw new TypeError("encodeDexDrive: payload Buffer required");
  if (!identifyN64_DexDrive(sourceContainer)) {
    throw new Error("encodeDexDrive: sourceContainer is not a valid DexDrive save.");
  }
  if (sourceContainer.length < DEX_SAVE_START) {
    throw new Error("encodeDexDrive: sourceContainer too small to contain DexDrive header.");
  }
  const header = sourceContainer.subarray(0, DEX_SAVE_START);
  return Buffer.concat([header, payload]);
}

module.exports = {
  identifyN64_DexDrive,
  decodeDexDrive,
  encodeDexDrive,

  // Expose constants in case tests/scripts want to assert offsets
  constants: {
    DEX_HDR_START,
    DEX_HDR_END,
    DEX_HDR_TEXT,
    DEX_COMMENTS_START,
    DEX_COMMENTS_END,
    DEX_SAVE_START,
  },
};
