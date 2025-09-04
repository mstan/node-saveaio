function swapEndian(input, bytes = 2) {
  if (!Buffer.isBuffer(input)) throw new TypeError("swapEndian: input must be a Buffer");
  if (input.length % bytes !== 0) throw new Error(`Buffer length not divisible by ${bytes}.`);
  const out = Buffer.allocUnsafe(input.length);
  for (let i = 0; i < input.length; i += bytes) {
    for (let b = 0; b < bytes; b++) out[i + b] = input[i + (bytes - 1 - b)];
  }
  return out;
}
module.exports = { swapEndian };