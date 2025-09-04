function setSize(input, bytes) {
  if (!Buffer.isBuffer(input)) throw new TypeError("setSize: input must be a Buffer");
  if (bytes <= 0) return Buffer.from(input);
  if (input.length >= bytes) return Buffer.from(input);
  const out = Buffer.alloc(bytes, 0x00);
  input.copy(out, 0);
  return out;
}

function expandToNextPow2(input) {
  if (!Buffer.isBuffer(input)) throw new TypeError("expandToNextPow2: input must be a Buffer");
  const len = Math.max(1, input.length);
  const nextPow2 = 1 << (Math.floor(Math.log2(len)) + 1);
  const out = Buffer.alloc(nextPow2, 0x00);
  input.copy(out, 0);
  return out;
}

module.exports = { setSize, expandToNextPow2 };