// src/adapters/gba.gssp.cjs
// GameBoy Advance GameShark SP extractor/injector
// EXACT port of your original logic (no heuristics):
//  - Identify: "ADVSAVEG" at [0..8)
//  - Decode:   slice from offset 1072 to ORIGINAL container end (NO trimming)
//  - Inject:   take header [0..1072) from a source GS-SP container and
//              concatenate the provided base save buffer.

const SP_TEXT = "ADVSAVEG";
const SP_HDR_START = 0;
const SP_HDR_END   = 8;
const SP_SAVE_START = 1072; // 0x0430

function decodeAscii(buf, start, end) {
  return Buffer.from(buf.subarray(start, end)).toString("utf8");
}

/** Signature check: ADVSAVEG at [0..8) */
function identifyGBA_GSSP(buf) {
  if (!Buffer.isBuffer(buf)) throw new TypeError("identifyGBA_GSSP: Buffer required");
  if (buf.length < SP_HDR_END) return false;
  return decodeAscii(buf, SP_HDR_START, SP_HDR_END) === SP_TEXT;
}

/** Decode GS-SP container → raw save.
 *  EXACT behavior: return container.slice(1072, container.length);
 *  (No whitespace trimming, no normalization.)
 */
function decodeGBA_GSSP(container) {
  if (!Buffer.isBuffer(container)) throw new TypeError("decodeGBA_GSSP: Buffer required");
  if (!identifyGBA_GSSP(container)) {
    throw new Error("Not a GameShark SP file (ADVSAVEG missing).");
  }
  if (container.length <= SP_SAVE_START) {
    throw new Error("GSSP too small; no payload.");
  }
  return Buffer.from(container.subarray(SP_SAVE_START, container.length));
}

/** Inject raw save into a GS-SP container, preserving header.
 *  EXACT behavior of your exportGamesharkSPSaveToMemory():
 *   - header = sourceContainer.slice(0, 1072)
 *   - result = header + baseSave
 *  Caller supplies a GS-SP container to borrow the header from.
 */
function injectGBA_GSSP(sourceContainer, baseSave) {
  if (!Buffer.isBuffer(sourceContainer)) throw new TypeError("injectGBA_GSSP: sourceContainer Buffer required");
  if (!Buffer.isBuffer(baseSave))       throw new TypeError("injectGBA_GSSP: baseSave Buffer required");

  if (!identifyGBA_GSSP(sourceContainer)) {
    throw new Error("injectGBA_GSSP: sourceContainer is not a valid GameShark SP file (ADVSAVEG missing).");
  }
  if (sourceContainer.length < SP_SAVE_START) {
    throw new Error("injectGBA_GSSP: sourceContainer too small to contain GS-SP header.");
  }

  const header = sourceContainer.subarray(0, SP_SAVE_START); // [0..1072)
  return Buffer.concat([header, baseSave]);
}

module.exports = { identifyGBA_GSSP, decodeGBA_GSSP, injectGBA_GSSP };
