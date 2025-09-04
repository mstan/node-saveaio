// src/adapters/n64.variants.cjs
// Produce the four N64 variants EXACTLY like your exportVariantsToMemory:
//   - original
//   - endianSwapped               (swapEndian(2))
//   - endianAndWordSwapped        (swapEndian(2) → swapWords(2))
//   - wordSwapped                 (endianAndWordSwapped → swapEndian(2))
//
// No mutations of input; pure functions.

const { swapEndian } = require("../buffers/endian.cjs");
const { swapWords }  = require("../buffers/words.cjs");

function makeN64Variants(baseBuf) {
  if (!Buffer.isBuffer(baseBuf)) throw new TypeError("makeN64Variants: Buffer required");

  const original = Buffer.from(baseBuf);
  const endianSwapped = swapEndian(original, 2);
  const endianAndWordSwapped = swapWords(endianSwapped, 2);
  const wordSwapped = swapEndian(endianAndWordSwapped, 2); // cancels endian, leaves word swap

  return { original, endianSwapped, wordSwapped, endianAndWordSwapped };
}

module.exports = { makeN64Variants };
