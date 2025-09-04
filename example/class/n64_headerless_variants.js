// Produce N64 headerless save variants (byte-swap, word-swap, byte+word) from a raw .sav.
//
// Usage:
//   node example/class/n64_headerless_variants.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFile, swapEndian, swapWords } = require("node-saveaio");

async function main() {
  // Headerless raw N64 save (e.g., SRAM/FlashRAM dump)
  const inputRaw = "./in/pokemon_stadium.sav";

  // Outputs
  const outByteSwap = "./out/pokemon_stadium.byteswapped.sav";        // 16-bit byte-swap
  const outWordSwap = "./out/pokemon_stadium.wordswapped.sav";        // swap 16-bit word pairs
  const outBothSwap = "./out/pokemon_stadium.byteswap_wordswap.sav";  // byte-swap then word-swap

  const raw = await readFile(inputRaw);

  // Use the generic SaveFile wrapper you already ship, then apply helpers.
  const s = new SaveFile(raw);
  const base = s.exportToMemory();      // returns a copy of the input buffer
  const bswap = swapEndian(base, 2);    // 0xAABB -> 0xBBAA (per 16-bit)
  const wswap = swapWords(base, 2);     // [w0,w1,w2,w3] -> [w1,w0,w3,w2]
  const both  = swapWords(bswap, 2);    // byte-swap, then word-swap

  await mkdir(dirname(resolve(outByteSwap)), { recursive: true });
  await writeFile(outByteSwap, bswap);
  await writeFile(outWordSwap, wswap);
  await writeFile(outBothSwap, both);

  console.log(`OK: byteswapped   (${bswap.length} B) → ${outByteSwap}`);
  console.log(`OK: wordswapped   (${wswap.length} B) → ${outWordSwap}`);
  console.log(`OK: byte+word swap(${both.length} B) → ${outBothSwap}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
