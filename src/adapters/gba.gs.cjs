// GameBoy Advance GameShark / Action Replay (non-SP, "SharkPortSave")
// Dependency-less adapter: IDENTIFY + DECODE + INJECT.
// Adds analysis helpers so callers can distinguish mirrored vs non-mirrored banks.
//
// Container format (little-endian):
//  u32  len("SharkPortSave") == 13
//  u8[] "SharkPortSave"
//  u32  platform (GBA == 0x000f0000)
//  u32  len(title),  u8[] title
//  u32  len(date),   u8[] date
//  u32  len(notes),  u8[] notes
//  u32  len(secondHeader + rawSave)  // secondHeader is 0x1C bytes
//  u8[] secondHeader (0x1C)
//  u8[] rawSave      (lenAbove - 0x1C)
//  u32  crc(secondHeader + rawSave)  // special rolling CRC (see calculateCRC)

const path = require("path");

const GS_TEXT = "SharkPortSave";
const CODE_GBA = 0x000f0000;
const SECOND_HEADER_LENGTH = 0x1C;

// ---- filename helper for unsupported Action Replay (.xps) ----
function _isXpsFilename(name) {
  if (!name) return false;
  try { return path.extname(String(name)).toLowerCase() === ".xps"; }
  catch { return false; }
}

// --- tiny readers/writers ---
function _u32(buf, off) {
  if (off + 4 > buf.length) throw new Error("SharkPortSave: truncated u32");
  return buf.readUInt32LE(off);
}
function _putU32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}
function _u16(buf, off) {
  if (off + 2 > buf.length) throw new Error("SharkPortSave: truncated u16");
  return buf.readUInt16LE(off);
}
function _u8(buf, off) {
  if (off + 1 > buf.length) throw new Error("SharkPortSave: truncated u8");
  return buf.readUInt8(off);
}

// VBA-M style rolling CRC (used for SharkPortSave for [secondHeader||raw])
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

// Strict parse (advanced; exported)
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
    positions: { secStart, secEnd, rawStart, rawEnd, crcOffset: rawEnd },
    secondHeader,
    secondHeaderFields: { internalName, romChecksum, romComplimentCheck, maker, flag },
    crcFromFile, crcCalculated,
    raw
  };
}

// Library-facing decode: return raw save Buffer
// opts?: { filename?: string }
function decodeGBA_GS(container, opts) {
  if (opts && _isXpsFilename(opts.filename)) {
    throw new Error("Action Replay (.xps) is unsupported");
  }
  const parsed = parseGBA_GS(container);
  return Buffer.from(parsed.raw);
}

// Build a new SharkPortSave container from parts
function encodeGBA_GSFromParts({ title = "", date = "", notes = "", secondHeader, secondHeaderFields, raw }) {
  if (!Buffer.isBuffer(raw)) throw new TypeError("encodeGBA_GSFromParts: raw Buffer required");
  if (secondHeader && !Buffer.isBuffer(secondHeader)) {
    throw new TypeError("encodeGBA_GSFromParts: secondHeader must be a Buffer if provided");
  }
  // Assemble second header (prefer exact bytes if provided)
  let sec;
  if (secondHeader) {
    if (secondHeader.length !== SECOND_HEADER_LENGTH) {
      throw new Error("encodeGBA_GSFromParts: secondHeader must be 0x1C bytes");
    }
    sec = Buffer.from(secondHeader);
  } else if (secondHeaderFields) {
    const {
      internalName = "",
      romChecksum = 0,
      romComplimentCheck = 0,
      maker = 0x30,
      flag = 1
    } = secondHeaderFields;
    const secBuf = Buffer.alloc(SECOND_HEADER_LENGTH, 0x00);
    Buffer.from(String(internalName), "ascii").subarray(0, 0x10).copy(secBuf, 0);
    secBuf.writeUInt16LE(romChecksum & 0xFFFF, 0x10);
    secBuf.writeUInt8(romComplimentCheck & 0xFF, 0x12);
    secBuf.writeUInt8(maker & 0xFF, 0x13);
    secBuf.writeUInt8(flag & 0xFF, 0x14);
    sec = secBuf;
  } else {
    throw new Error("encodeGBA_GSFromParts: either secondHeader or secondHeaderFields is required");
  }

  const ascii = (s) => Buffer.from(String(s ?? ""), "ascii");
  const chunks = [];

  // First header
  chunks.push(_putU32(GS_TEXT.length));
  chunks.push(Buffer.from(GS_TEXT, "ascii"));
  chunks.push(_putU32(CODE_GBA));

  // Strings
  const t = ascii(title);
  const d = ascii(date);
  const n = ascii(notes);

  chunks.push(_putU32(t.length), t);
  chunks.push(_putU32(d.length), d);
  chunks.push(_putU32(n.length), n);

  // [u32 len(sec+raw)]
  const secPlusRawLen = sec.length + raw.length;
  chunks.push(_putU32(secPlusRawLen));

  // CRC over [sec][raw]
  const secRaw = Buffer.concat([sec, raw]);
  const crc = calculateCRC(secRaw);

  // Payload
  chunks.push(sec, raw, _putU32(crc));

  return Buffer.concat(chunks);
}

// Inject: preserve textual header + second header from existing container, swap in new raw.
// opts?: { filename?: string }
function injectGBA_GS(container, newRaw, opts) {
  if (opts && _isXpsFilename(opts.filename)) {
    throw new Error("Action Replay (.xps) is unsupported");
  }
  if (!Buffer.isBuffer(container)) throw new TypeError("injectGBA_GS: container Buffer required");
  if (!Buffer.isBuffer(newRaw))    throw new TypeError("injectGBA_GS: newRaw Buffer required");

  const p = parseGBA_GS(container);
  return encodeGBA_GSFromParts({
    title: p.title,
    date:  p.date,
    notes: p.notes,
    secondHeader: p.secondHeader,
    raw: newRaw
  });
}

// --- OPTIONAL helpers to differentiate GS containers by payload shape ---
// Banks analysis: split the raw payload into two equal banks and compare.
function analyzeGSActions(raw) {
  if (!Buffer.isBuffer(raw)) throw new TypeError("analyzeGSActions: raw Buffer required");
  const n = raw.length >>> 0;
  const result = { bankSize: 0, banks: 1, mirrors: false, diffBytes: 0 };
  if (n === 0) return result;
  if (n % 2 !== 0) { result.bankSize = n; return result; }

  const half = n >>> 1;
  const a = raw.subarray(0, half);
  const b = raw.subarray(half, n);

  let diff = 0;
  for (let i = 0; i < half; i++) if (a[i] !== b[i]) diff++;

  result.bankSize = half;
  result.banks = 2;
  result.mirrors = (diff === 0);
  result.diffBytes = diff;
  return result;
}

// convenience: parse container -> analyze banks
function analyzeGSContainer(container) {
  const parsed = parseGBA_GS(container); // throws on malformed (unchanged)
  const bankInfo = analyzeGSActions(parsed.raw);
  return {
    title: parsed.title,
    date: parsed.date,
    notes: parsed.notes,
    secondHeader: parsed.secondHeaderFields,
    bankInfo
  };
}

module.exports = {
  identifyGBA_GS,
  decodeGBA_GS,
  injectGBA_GS,
  // helpers
  parseGBA_GS,
  encodeGBA_GSFromParts,
  calculateCRC,
  analyzeGSActions,
  analyzeGSContainer,
  // constants
  constants: {
    GS_TEXT,
    CODE_GBA,
    SECOND_HEADER_LENGTH
  }
};
