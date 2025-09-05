// NES Wii U Virtual Console (.ves) adapter
// Contract:
//  - 32-byte header
//  - decode: return ONLY the raw payload (e.g., 8 KiB), ignore any trailer bytes
//  - inject: keep header+trailer; replace payload only, and recompute checksum at 0x02..0x03

const HEADER_SIZE = 32;

// Valid NES SRAM sizes (power-of-two)
const VALID_SAVE_SIZES_DESC = [32768, 16384, 8192, 4096, 2048, 1024, 512];

function largestValidSizeLE(n) {
  for (const s of VALID_SAVE_SIZES_DESC) if (s <= n) return s;
  return null;
}

function identifyNES_WiiU(buf) {
  if (!Buffer.isBuffer(buf)) throw new TypeError("identifyNES_WiiU: Buffer required");
  if (buf.length <= HEADER_SIZE) return false;
  return (buf.length - HEADER_SIZE) >= VALID_SAVE_SIZES_DESC.at(-1);
}

function decodeNES_WiiU(container) {
  if (!Buffer.isBuffer(container)) throw new TypeError("decodeNES_WiiU: Buffer required");
  if (container.length <= HEADER_SIZE) throw new Error("NES Wii U container too small");

  const contentLen = container.length - HEADER_SIZE; // payload + trailer
  const payloadLen = largestValidSizeLE(contentLen);
  if (!payloadLen) throw new Error("NES Wii U container content smaller than minimum valid payload");

  return Buffer.from(container.subarray(HEADER_SIZE, HEADER_SIZE + payloadLen));
}

// ---- checksum helpers (ported from SNES behavior) ----
function sum16(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s = (s + (buf[i] & 0xFF)) & 0xFFFF;
  return s;
}

function encodeChecksumBytes(sum) {
  // Store as: swap(sum16) then decrement the high byte by 1.
  const hi = (sum >>> 8) & 0xFF;
  const lo = sum & 0xFF;
  const swapped_hi = lo;
  const swapped_lo = hi;
  const dec_hi = (swapped_hi - 1) & 0xFF;
  return Buffer.from([dec_hi, swapped_lo]); // bytes at 0x02..0x03 (LE positions)
}

/**
 * Inject raw NES SRAM into a Wii U .ves container:
 *  - preserve original 32B header and any trailer
 *  - replace payload
 *  - recompute checksum at 0x02..0x03 (same scheme as SNES)
 *
 * NOTE: Signature preserved as (base, container) to match your existing code.
 */
function injectNES_WiiU(base, container) {
  if (!Buffer.isBuffer(base))      throw new TypeError("injectNES_WiiU: base Buffer required");
  if (!Buffer.isBuffer(container)) throw new TypeError("injectNES_WiiU: container Buffer required");
  if (!VALID_SAVE_SIZES_DESC.includes(base.length)) {
    const asc = VALID_SAVE_SIZES_DESC.slice().reverse().join(", ");
    throw new Error(`NES base save must be one of: ${asc}`);
  }
  if (container.length <= HEADER_SIZE) throw new Error("NES Wii U container too small");

  const headerOriginal = container.subarray(0, HEADER_SIZE);
  const tailStart = HEADER_SIZE + base.length;
  const tail = container.subarray(tailStart); // may be empty if no trailer

  // Recompute checksum over (header with zeroed checksum) + new payload
  const hdr = Buffer.from(headerOriginal); // working copy
  hdr[0x02] = 0x00; hdr[0x03] = 0x00;
  const totalSum = (sum16(hdr) + sum16(base)) & 0xFFFF;
  const chk = encodeChecksumBytes(totalSum);
  chk.copy(hdr, 0x02);

  // Reassemble: (updated header) + payload + original tail (if any)
  return Buffer.concat([hdr, base, tail]);
}

module.exports = {
  identifyNES_WiiU,
  decodeNES_WiiU,
  injectNES_WiiU,
};
