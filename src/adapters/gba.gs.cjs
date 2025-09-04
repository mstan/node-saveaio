// src/adapters/gba.gs.cjs
// GameBoy Advance GameShark / Action Replay (non-SP, "SharkPortSave")
// Your original project did NOT implement extraction, so we only detect it.

const GS_TEXT = "SharkPortSave";
const GS_HDR_START = 3;   // byte offset 3
const GS_HDR_END   = 17;  // byte offset 17 (exclusive)

function identifyGBA_GS(buf) {
  if (!Buffer.isBuffer(buf)) throw new TypeError("identifyGBA_GS: Buffer required");
  if (buf.length < GS_HDR_END) return false;
  const s = Buffer.from(buf.subarray(GS_HDR_START, GS_HDR_END)).toString("utf8");
  return s === GS_TEXT;
}

function decodeGBA_GS(container) {
  if (!Buffer.isBuffer(container)) throw new TypeError("decodeGBA_GS: Buffer required");
  throw new Error(
    'GBA GameShark / Action Replay (non-SP, "SharkPortSave") extraction is not implemented (matches original scope).'
  );
}

module.exports = { identifyGBA_GS, decodeGBA_GS };
