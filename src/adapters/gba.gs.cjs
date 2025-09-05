// GameBoy Advance GameShark / Action Replay (non-SP, "SharkPortSave")
// Minimal, dependency-less adapter that can IDENTIFY and DECODE (extract raw save).
// No injection here (keeping your rollback intact).

const GS_TEXT = "SharkPortSave";
const CODE_GBA = 0x000f0000;
const SECOND_HEADER_LENGTH = 0x1C;

// --- tiny readers ---
function _u32(buf, off) {
  if (off + 4 > buf.length) throw new Error("SharkPortSave: truncated u32");
  return buf.readUInt32LE(off);
}
function _u16(buf, off) {
  if (off + 2 > buf.length) throw new Error("SharkPortSave: truncated u16");
  return buf.readUInt16LE(off);
}
function _u8(buf, off) {
  if (off + 1 > buf.length) throw new Error("SharkPortSave: truncated u8");
  return buf.readUInt8(off);
}

// VBA-M style rolling CRC used by some tools (exposed for tests/tools)
function calculateCRC(arr) {
  let crc = 0 >>> 0;
  for (let i = 0; i < arr.length; i++) {
    crc = (crc + ((arr[i] << (crc % 18)) >>> 0)) >>> 0;
  }
  return crc >>> 0;
}

// Fast header probe (string + platform)
function identifyGBA_GS(buf) {
  if (!Buffer.isBuffer(buf)) throw new TypeError("identifyGBA_GS: Buffer required");
  if (buf.length < 4) return false;

  let o = 0;
  const textLen = _u32(buf, o); o += 4;
  if (textLen <= 0 || o + textLen > buf.length) return false;

  const tag = buf.subarray(o, o + textLen).toString("ascii"); o += textLen;
  if (tag !== GS_TEXT) return false;

  if (o + 4 > buf.length) return false;
  const platform = _u32(buf, o); o += 4;
  if (platform !== CODE_GBA) return false;

  return true;
}

// Strict parse (exposed for advanced use)
function parseGBA_GS(container) {
  if (!Buffer.isBuffer(container)) throw new TypeError("parseGBA_GS: Buffer required");

  let o = 0;

  // "SharkPortSave"
  const textLen = _u32(container, o); o += 4;
  const text = container.subarray(o, o + textLen).toString("ascii"); o += textLen;
  if (text !== GS_TEXT) throw new Error("This is not a SharkPortSave container");

  // Platform
  const platform = _u32(container, o); o += 4;
  if (platform !== CODE_GBA) throw new Error("This is not a GBA SharkPortSave file");

  // Title / Date / Notes (length-prefixed ASCII)
  const titleLen = _u32(container, o); o += 4;
  const title = container.subarray(o, o + titleLen).toString("ascii"); o += titleLen;

  const dateLen = _u32(container, o); o += 4;
  const date = container.subarray(o, o + dateLen).toString("ascii"); o += dateLen;

  const notesLen = _u32(container, o); o += 4;
  const notes = container.subarray(o, o + notesLen).toString("ascii"); o += notesLen;

  // secondHeader + raw
  const secPlusRawLen = _u32(container, o); o += 4;
  if (secPlusRawLen < SECOND_HEADER_LENGTH) {
    throw new Error("SharkPortSave: invalid payload length");
  }

  const secStart = o;
  const secEnd   = secStart + SECOND_HEADER_LENGTH;
  const rawStart = secEnd;
  const rawEnd   = secStart + secPlusRawLen;

  if (rawEnd + 4 > container.length) throw new Error("SharkPortSave: truncated payload");

  const secondHeader = container.subarray(secStart, secEnd);
  const raw          = container.subarray(rawStart, rawEnd);

  const crcFromFile   = _u32(container, rawEnd);
  const crcCalculated = calculateCRC(container.subarray(secStart, rawEnd));

  // A few handy fields (not required for decode)
  const internalName         = secondHeader.subarray(0, 0x10).toString("ascii");
  const romChecksum          = _u16(secondHeader, 0x10);
  const romComplimentCheck   = _u8(secondHeader, 0x12);
  const maker                = _u8(secondHeader, 0x13);
  const flag                 = _u8(secondHeader, 0x14);

  return {
    title, date, notes, platform,
    secondHeader,
    secondHeaderFields: { internalName, romChecksum, romComplimentCheck, maker, flag },
    crcFromFile, crcCalculated,
    raw
  };
}

// Library-facing decode: return raw save Buffer
function decodeGBA_GS(container) {
  const parsed = parseGBA_GS(container);
  return Buffer.from(parsed.raw);
}

module.exports = {
  identifyGBA_GS,
  decodeGBA_GS,
  // helpful for tests/tools
  parseGBA_GS,
  calculateCRC,
  constants: {
    GS_TEXT,
    CODE_GBA,
    SECOND_HEADER_LENGTH
  }
};
