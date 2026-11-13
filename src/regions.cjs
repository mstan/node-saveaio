// Retail save layouts, not ROM patching or universal region conversion.
const ORDERS = ["be", "byte-swapped", "word-swapped", "le32"];
const OOT_MAGIC = Buffer.from([0x98, 9, 0x10, 0x21, 0x5a, 0x45, 0x4c, 0x44, 0x41]);
const ZM_REGION = { us: 2, eu: 1 };
const ZM_VERSION = { us: "ZeroMissionUSAver005", eu: "ZeroMissionEURver005" };
const ZM_HEADERS = [0, 0x40, 0x6d40];

function checkArgs(buffer, options) {
  if (!Buffer.isBuffer(buffer)) throw new TypeError("Expected a save Buffer");
  if (!options || !["oot-n64", "metroid-zero-mission"].includes(options.game))
    throw new Error("Unsupported game; no generic region conversion is attempted");
  if (options.game === "metroid-zero-mission" &&
      (options.inputByteOrder !== undefined || options.outputByteOrder !== undefined))
    throw new Error("N64 byte order options do not apply to GBA saves");
}
function checkRegion(region) {
  if (region !== "us" && region !== "eu") throw new Error("Supported regions are us and eu");
}
function orderCopy(buffer, order) {
  if (!ORDERS.includes(order)) throw new Error("Unknown N64 byte order");
  const out = Buffer.from(buffer);
  const mask = { be: 0, "byte-swapped": 1, "word-swapped": 2, le32: 3 }[order];
  for (let i = 0; i < buffer.length; i++) out[i] = buffer[i ^ mask];
  return out;
}
function ootDecode(buffer, inputByteOrder = "auto") {
  if (buffer.length !== 0x8000) throw new Error("OoT requires a raw 32 KiB SRAM image");
  const orders = inputByteOrder === "auto" ? ORDERS : [inputByteOrder];
  const matches = orders.map(order => ({ order, data: orderCopy(buffer, order) }))
    .filter(({ data }) => data.subarray(3, 12).equals(OOT_MAGIC));
  if (matches.length !== 1) throw new Error("Unrecognized or ambiguous OoT SRAM header/byte order");
  return matches[0];
}
function ootInspect(buffer, region, inputByteOrder) {
  const decoded = ootDecode(buffer, inputByteOrder), data = decoded.data;
  if (data[0] > 3 || data[1] > 1 || data[2] > (region === "eu" ? 2 : 1))
    throw new Error("Invalid OoT header settings for source region");
  if (region === "us" && data[2] !== 1) throw new Error("OoT US source must select English");
  const slots = [];
  for (let n = 0; n < 6; n++) {
    const offset = 0x20 + n * 0x1450;
    const slot = data.subarray(offset, offset + 0x1354);
    const magic = slot.subarray(0x1c, 0x22);
    const occupied = magic.equals(Buffer.from("ZELDAZ"));
    if (!occupied && !magic.every(value => value === 0)) throw new Error(`Unknown OoT slot ${n} marker`);
    let checksum = 0;
    for (let i = 0; i < 0x1352; i += 2) checksum = (checksum + slot.readUInt16BE(i)) & 0xffff;
    if (checksum !== slot.readUInt16BE(0x1352)) throw new Error(`OoT slot ${n} checksum mismatch`);
    // PAL and US share the basic Latin file-name codes. Other alphabets
    // require a separately qualified character mapping, not a guessed swap.
    if (occupied && slot.subarray(0x24, 0x2c).some(value => value > 0x3e))
      throw new Error(`OoT slot ${n} uses an unsupported name character`);
    slots.push({ index: n, occupied, checksum });
  }
  return { data, byteOrder: decoded.order, slots };
}
function sum32(data, offset, size) {
  let checksum = 0;
  for (let i = offset; i < offset + size; i += 4) checksum = (checksum + data.readUInt32LE(i)) >>> 0;
  return checksum;
}
function zmInspect(buffer, region) {
  if (buffer.length !== 0x8000) throw new Error("Zero Mission requires a raw 32 KiB save image");
  for (const offset of ZM_HEADERS) {
    if (!buffer.subarray(offset + 0x1c, offset + 0x30).equals(Buffer.from(ZM_VERSION[region])) ||
        buffer[offset + 0xf] !== ZM_REGION[region])
      throw new Error(`Unknown Zero Mission region/version header at ${offset}`);
    const checksum = buffer.readUInt32LE(offset);
    if (checksum !== sum32(buffer, offset, 0x40) || checksum !== (~buffer.readUInt32LE(offset + 4) >>> 0))
      throw new Error(`Zero Mission header checksum mismatch at ${offset}`);
  }
  // Both retail regions number English as2. Preserve that language instead
  // of pretending a region marker also translates text or other alphabets.
  for (const offset of [0x6dc0, 0x6e00]) {
    if (buffer[offset] !== 0x1f || buffer[offset + 0x16] !== 2 ||
        buffer.subarray(offset + 6, offset + 22).toString() !== "_SELECT_LANGUAGE" ||
        buffer.subarray(offset + 23, offset + 39).toString() !== "ENDKEY_LANGUAGE_")
      throw new Error("Zero Mission conversion requires valid English language records");
    let checksum = 0;
    for (let i = offset; i < offset + 64; i += 2) checksum = (checksum + buffer.readUInt16LE(i)) & 0xffff;
    if (checksum !== buffer.readUInt16LE(offset + 2) ||
        checksum !== (~buffer.readUInt16LE(offset + 4) & 0xffff))
      throw new Error("Zero Mission language record checksum mismatch");
  }
  const slots = [];
  for (let n = 0; n < 6; n++) {
    const offset = 0x80 + n * 0x1220, slot = buffer.subarray(offset, offset + 0x1220);
    const empty = slot.every(value => value === 0xff);
    if (!empty) {
      const matches = (at, text) => slot.subarray(at, at + 16).equals(Buffer.from(text.padEnd(16, "\0")));
      if (!matches(0, "ZERO_MISSION_010") || !matches(0x4f, "Planet Zebes... ") || !matches(0x250, " - Samus Aran - "))
        throw new Error(`Unknown Zero Mission slot ${n} markers`);
      const checksum = slot.readUInt32LE(0x10);
      if (checksum !== sum32(slot, 0, slot.length) || checksum !== (~slot.readUInt32LE(0x14) >>> 0))
        throw new Error(`Zero Mission slot ${n} checksum mismatch`);
      if (slot[0x1a] !== 2) throw new Error(`Zero Mission slot ${n} is not English`);
    }
    slots.push({ index: n, occupied: !empty });
  }
  return { slots };
}

/** Validate a supported retail layout without modifying input or repairing data. */
function inspectSaveRegion(buffer, options) {
  checkArgs(buffer, options); checkRegion(options.region);
  const result = options.game === "oot-n64" ? ootInspect(buffer, options.region, options.inputByteOrder) : zmInspect(buffer, options.region);
  const { data, ...metadata } = result;
  return { game: options.game, region: options.region, ...metadata };
}

/** Return a new raw save image. The caller owns all input/output file I/O. */
function convertSaveRegion(buffer, options) {
  checkArgs(buffer, options); checkRegion(options.fromRegion); checkRegion(options.toRegion);
  if (options.game === "oot-n64") {
    const result = ootInspect(buffer, options.fromRegion, options.inputByteOrder);
    const data = result.data;
    // US English=1; PAL English=0. File records and their checksums are
    // unchanged. This intentionally chooses English in the destination.
    if (options.fromRegion !== options.toRegion) data[2] = options.toRegion === "us" ? 1 : 0;
    return orderCopy(data, !options.outputByteOrder || options.outputByteOrder === "same" ? result.byteOrder : options.outputByteOrder);
  }
  zmInspect(buffer, options.fromRegion);
  const out = Buffer.from(buffer);
  for (const offset of ZM_HEADERS) {
    out[offset + 0xf] = ZM_REGION[options.toRegion];
    Buffer.from(ZM_VERSION[options.toRegion]).copy(out, offset + 0x1c);
    out.writeUInt32LE(0, offset); out.writeUInt32LE(0xffffffff, offset + 4);
    const checksum = sum32(out, offset, 0x40);
    out.writeUInt32LE(checksum, offset); out.writeUInt32LE(~checksum >>> 0, offset + 4);
  }
  return out;
}

module.exports = { inspectSaveRegion, convertSaveRegion };
