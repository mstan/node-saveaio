// NES Wii U Virtual Console (.ves) adapter
// Contract:
//  - 32-byte header
//  - decode: return ONLY the raw payload (e.g., 8 KiB), ignore any trailer bytes
//  - inject: keep header+trailer; replace payload only

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

function injectNES_WiiU(base, container) {
  if (!Buffer.isBuffer(base)) throw new TypeError("injectNES_WiiU: base Buffer required");
  if (!Buffer.isBuffer(container)) throw new TypeError("injectNES_WiiU: container Buffer required");
  if (!VALID_SAVE_SIZES_DESC.includes(base.length)) {
    const asc = VALID_SAVE_SIZES_DESC.slice().reverse().join(", ");
    throw new Error(`NES base save must be one of: ${asc}`);
  }
  if (container.length <= HEADER_SIZE) throw new Error("NES Wii U container too small");

  const header = container.subarray(0, HEADER_SIZE);
  const tailStart = HEADER_SIZE + base.length;
  const tail = container.subarray(tailStart);
  return Buffer.concat([header, base, tail]);
}

module.exports = {
  identifyNES_WiiU,
  decodeNES_WiiU,
  injectNES_WiiU,
};
