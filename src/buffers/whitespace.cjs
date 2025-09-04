function trimTrailingZeros(input) {
  if (!Buffer.isBuffer(input)) throw new TypeError("trimTrailingZeros: input must be a Buffer");
  let end = input.length;
  while (end > 0 && input[end - 1] === 0x00) end--;
  return input.subarray(0, end);
}
module.exports = { trimTrailingZeros };