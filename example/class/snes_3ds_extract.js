// Extract raw SNES save from a Nintendo 3DS container using the class API.
// Writes a headerless raw .sav (payload only).
//
// Usage:
//   node example/class/snes_3ds_extract.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileSNES } = require("node-saveaio");

async function main() {
  // 3DS save container (example name; actual path depends on your dump)
  const inputSav = "./in/000400000F700E00.ves";
  // Headerless raw SNES SRAM
  const outputRaw = "./out/super_mario_world.sav";

  const container = await readFile(inputSav);

  const s = new SaveFileSNES(container); // auto-detects on construct
  if (s.saveFileType !== "nintendo_3ds") {
    throw new Error(`Expected Nintendo 3DS, got ${s.saveFileType}`);
  }

  const raw = s.getRaw();

  await mkdir(dirname(resolve(outputRaw)), { recursive: true });
  await writeFile(outputRaw, raw);

  console.log(`OK: extracted raw (${raw.length} B) → ${outputRaw}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
