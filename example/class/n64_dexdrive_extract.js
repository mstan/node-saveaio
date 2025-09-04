// Extract raw N64 save from a DexDrive container (.n64) using class APIs.
// Writes the four common variants: raw, byteswapped, wordswapped, byteswap+wordswap.
//
// Usage:
//   node example/class/n64_dexdrive_extract.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve, basename } = require("path");
const { SaveFileN64, SaveFile, swapEndian, swapWords } = require("node-saveaio");

async function main() {
  // DexDrive export for an N64 title (example filename with a card slot index like ".856")
  const inputDex = "./in/blast_corps.856.n64";

  // Outputs (4 variants of the decoded raw SRAM/FlashRAM)
  const stem        = "./out/blast_corps.n64";
  const outRaw      = `${stem}.raw.sav`;
  const outByteSwap = `${stem}.byteswapped.sav`;
  const outWordSwap = `${stem}.wordswapped.sav`;
  const outBothSwap = `${stem}.byteswap_wordswap.sav`;

  const container = await readFile(inputDex);

  // Class detects DexDrive and exposes the payload as "raw" data.
  const s = new SaveFileN64(container); // auto-detects on construct
  const meta = s.getMetadata ? s.getMetadata() : { type: "unknown" };
  if (meta.type !== "dexdrive" && meta.type !== "raw") {
    console.warn(`[WARN] ${basename(inputDex)}: detected ${meta.type}`);
  }

  const raw = s.getRaw();

  // Just log header size for transparency
  const headerLen = Math.max(0, container.length - raw.length);
  console.log(`DexDrive header length: ${headerLen} bytes`);

  await mkdir(dirname(resolve(outRaw)), { recursive: true });

  // Produce variants using the generic SaveFile + swap helpers
  const base  = new SaveFile(raw);
  const orig  = base.exportToMemory();
  const bswap = swapEndian(orig, 2); // byte-swap 16-bit
  const wswap = swapWords(orig, 2);  // word-swap pairs of 16-bit words
  const both  = swapWords(bswap, 2); // byte-swap then word-swap

  await writeFile(outRaw,      orig);
  await writeFile(outByteSwap, bswap);
  await writeFile(outWordSwap, wswap);
  await writeFile(outBothSwap, both);

  console.log(`OK: raw           (${orig.length} B) → ${outRaw}`);
  console.log(`OK: byteswapped   (${bswap.length} B) → ${outByteSwap}`);
  console.log(`OK: wordswapped   (${wswap.length} B) → ${outWordSwap}`);
  console.log(`OK: byte+word swap(${both.length} B) → ${outBothSwap}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
