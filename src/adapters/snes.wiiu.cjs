// SNES Wii U Virtual Console adapter
// Header: 48 bytes. Payload follows immediately; no trailer.
// Reinjection now implemented based on public reverse engineering notes.
//
// Header map (offsets in hex):
//   00..01  : 0x0100 (constant)
//   02..03  : checksum-16 (stored as: swap(sum16) then decrement the high byte by 1)
//   04..05  : preset/game ID (LE) — optional; preserved from original if present
//   06..07  : 0x0000 (constant)
//   08..0C  : timestamp-ish / per-title bytes (preserved from original)
//   0D..0F  : 0x000000 (constant)
//   10..17  : magic 0xC1 35 86 A5 65 CB 94 2C (required)
//   18..19  : save size in KiB (LE) — optional
//   1A..1B  : 0x0000 (constant)
//   1C..1F  : changing/unknown (preserved from original)
//   20..2F  : 0x00…00 (16 bytes)
//
// Checksum algorithm used to populate bytes 0x02..0x03:
//   1) Build header with checksum field set to 00 00.
//   2) Compute sum16 = (sum of ALL bytes: header + payload) & 0xFFFF.
//   3) Transform for storage: swap bytes, then decrement the first (high) byte by 1.
//      Examples from research: 0x470F -> stored 0x0E47; 0xB1D5 -> 0xD4B1; 0x6120 -> 0x1F61.

const HEADER_SIZE = 48;
const MAGIC = Buffer.from([0xC1, 0x35, 0x86, 0xA5, 0x65, 0xCB, 0x94, 0x2C]);

function identifySNES_WiiU(buf) {
  return Buffer.isBuffer(buf)
    && buf.length > HEADER_SIZE
    && buf.subarray(0x10, 0x18).equals(MAGIC); // strong signal for Wii U SNES
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

function sum16(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s = (s + (buf[i] & 0xFF)) & 0xFFFF;
  return s;
}

function encodeChecksumBytes(sum) {
  // Store as: swap(sum16) then decrement high byte by 1.
  const hi = (sum >>> 8) & 0xFF;
  const lo = sum & 0xFF;
  const swapped_hi = lo;
  const swapped_lo = hi;
  const dec_hi = (swapped_hi - 1) & 0xFF;
  return Buffer.from([dec_hi, swapped_lo]); // bytes at 0x02..0x03 (LE positions)
}

/**
 * Construct a Wii U header for a given payload by starting from an original header
 * (to preserve unknown fields) and overwriting the documented constants.
 *
 * @param {Buffer} originalContainer  The original Wii U .ves container (48B header + payload)
 * @param {Buffer} payload            Raw SNES SRAM payload to inject
 * @param {{presetIdLE?: number, sizeKiB?: number, debugChecksum?: boolean}} [opts]
 * @returns {Buffer} new 48-byte header
 */
function buildHeaderWiiU(originalContainer, payload, opts = {}) {
  const hdr = Buffer.alloc(HEADER_SIZE, 0x00);

  // If we have an original header, copy it wholesale to preserve unknowns.
  if (Buffer.isBuffer(originalContainer) && originalContainer.length >= HEADER_SIZE) {
    originalContainer.subarray(0, HEADER_SIZE).copy(hdr);
  }

  // Documented constants / required fields
  hdr[0x00] = 0x01; hdr[0x01] = 0x00;      // version?
  hdr[0x06] = 0x00; hdr[0x07] = 0x00;
  hdr[0x0D] = 0x00; hdr[0x0E] = 0x00; hdr[0x0F] = 0x00;
  MAGIC.copy(hdr, 0x10);                   // required magic
  hdr[0x1A] = 0x00; hdr[0x1B] = 0x00;
  hdr.fill(0x00, 0x20, 0x30);

  // Optional fields (leave preserved if not provided)
  if (Number.isInteger(opts.presetIdLE)) {
    hdr[0x04] = opts.presetIdLE & 0xFF;
    hdr[0x05] = (opts.presetIdLE >>> 8) & 0xFF;
  }
  if (Number.isInteger(opts.sizeKiB)) {
    hdr[0x18] = opts.sizeKiB & 0xFF;
    hdr[0x19] = (opts.sizeKiB >>> 8) & 0xFF;
  }

  // Checksum: compute over (header with 0 checksum) + payload
  hdr[0x02] = 0x00; hdr[0x03] = 0x00;
  const sum = sum16(hdr) + sum16(payload);
  const sum16mod = sum & 0xFFFF;
  const chkBytes = encodeChecksumBytes(sum16mod);
  chkBytes.copy(hdr, 0x02);

  if (opts.debugChecksum) {
    const rawStored = hdr.readUInt16LE(0x02);
    // Show values in hex for debugging
    console.debug(
      `[SNES WiiU inject] sum16=0x${sum16mod.toString(16).padStart(4, "0")} storedLE=0x${rawStored
        .toString(16)
        .padStart(4, "0")}`
    );
  }

  return hdr;
}

/**
 * Inject a raw payload into a Wii U SNES container.
 * Preserves unknown header fields by copying them from the original container.
 *
 * @param {Buffer} originalContainer  Original container (.ves) with 48B header
 * @param {Buffer} payload            Raw SNES SRAM data
 * @param {{presetIdLE?: number, sizeKiB?: number, debugChecksum?: boolean}} [opts]
 * @returns {Buffer} new container (header + payload)
 */
function injectSNES_WiiU(originalContainer, payload, opts = {}) {
  if (!Buffer.isBuffer(originalContainer)) {
    throw new TypeError("injectSNES_WiiU: originalContainer Buffer required");
  }
  if (!Buffer.isBuffer(payload)) {
    throw new TypeError("injectSNES_WiiU: payload Buffer required");
  }
  if (!identifySNES_WiiU(originalContainer)) {
    throw new Error("injectSNES_WiiU: originalContainer is not a Wii U SNES .ves");
  }

  const sizeKiB = Math.round(payload.length / 1024);
  const hdr = buildHeaderWiiU(originalContainer, payload, { ...opts, sizeKiB });
  return Buffer.concat([hdr, payload]);
}

module.exports = {
  identifySNES_WiiU,
  decodeSNES_WiiU,
  injectSNES_WiiU,
};
