// Extract raw NES save from a Wii U VC container (.ves) using the class API.
// Writes a headerless raw .sav (payload only).
//
// Usage:
//   node example/class/nes_wiiu_extract.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileNES } = require("node-saveaio");

async function main() {
  // Wii U .ves container extracted from Virtual Console title
  const inputVes  = "./in/WUP-FBAE.ves";
  // Headerless raw NES SRAM payload (e.g., 8 KiB)
  const outputRaw = "./out/legend_of_zelda.sav";

  const container = await readFile(inputVes);

  const s = new SaveFileNES(container); // auto-detects on construct
  if (s.saveFileType !== "wii_u_virtual_console") {
    throw new Error(`Expected Wii U VC, got ${s.saveFileType}`);
  }

  // Returns ONLY the payload (header removed, trailer ignored)
  const raw = s.getRaw();

  await mkdir(dirname(resolve(outputRaw)), { recursive: true });
  await writeFile(outputRaw, raw);

  console.log(`OK: extracted raw (${raw.length} B) → ${outputRaw}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
