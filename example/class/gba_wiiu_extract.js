// Extract raw GBA save from a Wii U VC container (.bin) using the class API.
// Writes both the raw payload and an optional normalized variant.
//
// Usage:
//   node example/class/gba_wiiu_extract.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileGBA } = require("node-saveaio");


async function main() {
   // Wii U bin containing containerized save file for Megaman Battle Network 3 Blue extracted using SaveMii
  const inputBin        = "./in/data_008_0000.bin";
  // A headerless, raw extract of Megaman Battle Network 3 Blue
  const outputRaw       =  "./out/megaman_battle_network_3_blue.raw.sav";
  // A headerless, normalized extract of Megaman Battle Network 3 Blue that is trimmed/expanded to the target size
  const outputNormalized= "./out/megaman_battle_network_3_blue.normalized.sav"; 
  const targetSize      = 32768 // defaults to 32 KiB

  const container = await readFile(inputBin);

  const s = new SaveFileGBA(container); // auto-detects on construct
  if (s.saveFileType !== "wii_u_virtual_console") {
    throw new Error(`Expected Wii U VC, got ${s.saveFileType}`);
  }

  const raw   = s.getRaw();                        // [0x4080..trimmed end]
  const norm  = s.normalizeSize(targetSize);       // trim/pad to target size

  await mkdir(dirname(resolve(outputRaw)), { recursive: true });
  await writeFile(outputRaw, raw);
  await writeFile(outputNormalized, norm);

  console.log(`OK: extracted raw (${raw.length} B) → ${outputRaw}`);
  console.log(`OK: normalized to ${targetSize} B → ${outputNormalized}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
