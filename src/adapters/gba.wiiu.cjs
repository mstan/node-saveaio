// GBA Wii U Virtual Console (.bin) adapter – SaveAIO-accurate
// Test contract (see test/wiiu_extract.cjs & wiiu_inject_roundtrip.cjs):
//  - Verify ASCII "STATRAM0" at [0x4000..0x4008)
//  - decode: trim ONLY trailing 0x00 from the *container*, then return slice [0x4080..trimmedEnd]
//  - inject: result = header(0..0x4080) + newPayload + originalTail(from 0x4080+newLen..end)

const MAGIC_OFFSET = 0x4000;
const MAGIC = "STATRAM0";
const PAYLOAD_OFFSET = 0x4080; // 0x4000 + 0x80

function hasMagicAt4000(buf) {
  if (!Buffer.isBuffer(buf)) throw new TypeError("identifyGBA_WiiU: Buffer required");
  if (buf.length < MAGIC_OFFSET + MAGIC.length) return false;
  const got = buf.subarray(MAGIC_OFFSET, MAGIC_OFFSET + MAGIC.length).toString("ascii");
  return got === MAGIC;
}

function identifyGBA_WiiU(buf) {
  return hasMagicAt4000(buf) && buf.length > PAYLOAD_OFFSET;
}

function decodeGBA_WiiU(container) {
  if (!Buffer.isBuffer(container)) throw new TypeError("decodeGBA_WiiU: Buffer required");
  if (!identifyGBA_WiiU(container)) {
    throw new Error('decodeGBA_WiiU: invalid Wii U container (magic "STATRAM0" missing or too small)');
  }

  // Trim ONLY trailing zeros from the *container*, not from the payload slice.
  let end = container.length;
  while (end > 0 && container[end - 1] === 0x00) end--;

  if (end <= PAYLOAD_OFFSET) return Buffer.alloc(0);
  return Buffer.from(container.subarray(PAYLOAD_OFFSET, end));
}

function injectGBA_WiiU(container, newPayload) {
  if (!Buffer.isBuffer(container)) throw new TypeError("injectGBA_WiiU: container Buffer required");
  if (!Buffer.isBuffer(newPayload)) throw new TypeError("injectGBA_WiiU: newPayload Buffer required");
  if (!identifyGBA_WiiU(container)) {
    throw new Error('injectGBA_WiiU: invalid Wii U container (magic "STATRAM0" missing or too small)');
  }

  const header = container.subarray(0, PAYLOAD_OFFSET);
  const tailStart = PAYLOAD_OFFSET + newPayload.length;
  const tail = container.subarray(tailStart);
  return Buffer.concat([header, newPayload, tail]);
}

module.exports = {
  identifyGBA_WiiU,
  decodeGBA_WiiU,
  injectGBA_WiiU,
  // Historical alias names used earlier in the WIP port:
  identifyGBA_WiiU_BIN: identifyGBA_WiiU,
  decodeGBA_WiiU_BIN: decodeGBA_WiiU,
  injectGBA_WiiU_BIN: injectGBA_WiiU,
};
