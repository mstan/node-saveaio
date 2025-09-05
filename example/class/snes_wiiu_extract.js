// Extract raw SNES save from a Wii U VC container (.bin) using the class API.
// Writes a headerless raw .sav (payload only).
//
// Usage:
//   node example/class/snes_wiiu_extract.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileSNES } = require("node-saveaio");

async function main() {
  // Wii U VC container extracted from a SNES title (e.g., via SaveMii)
  const inputBin  = "./in/WUP-N-JAAE.bin";
  // Headerless raw SNES SRAM
  const outputRaw = "./out/super_mario_world.sav";

  const container = await readFile(inputBin);

  const s = new SaveFileSNES(container); // auto-detects on construct
  if (s.saveFileType !== "wii_u_virtual_console") {
    throw new Error(`Expected Wii U VC, got ${s.saveFileType}`);
  }

  // Returns ONLY the payload (container header/trailer removed/ignored)
  const raw = s.getRaw();

  await mkdir(dirname(resolve(outputRaw)), { recursive: true });
  await writeFile(outputRaw, raw);

  console.log(`OK: extracted raw (${raw.length} B) → ${outputRaw}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
