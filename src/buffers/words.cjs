function swapWords(input, bytes = 2) {
  if (!Buffer.isBuffer(input)) throw new TypeError("swapWords: input must be a Buffer");
  const span = bytes * 2;
  if (input.length % span !== 0) throw new Error(`Buffer length not divisible by ${span}.`);
  const out = Buffer.allocUnsafe(input.length);
  for (let i = 0; i < input.length; i += span) {
    input.copy(out, i, i + bytes, i + span);
    input.copy(out, i + bytes, i, i + bytes);
  }
  return out;
}
module.exports = { swapWords };