// Extract raw GBA save from a GameShark SP container (.gsv/.sps) using the class API.
// Writes the headerless raw payload and a normalized 32 KiB variant.
//
// Usage:
//   node example/class/gba_gamesharksp_extract.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileGBA } = require("node-saveaio");

async function main() {
  // GameShark SP container for Mega Man Battle Network 3 Blue (example filename)
  const inputGsSp = "./in/megaman_battle_network_3_blue.gsv";
  // Headerless raw save extracted from the GS-SP container
  const outputRaw = "./out/megaman_battle_network_3_blue.raw.sav";
  // Normalized variant (trim/pad to the target size; default 32 KiB)
  const outputNormalized = "./out/megaman_battle_network_3_blue.normalized.sav";
  const targetSize = 32768; // 32 KiB default

  const container = await readFile(inputGsSp);

  const s = new SaveFileGBA(container); // auto-detects on construct
  if (s.saveFileType !== "gameshark_sp") {
    throw new Error(`Expected GameShark SP, got ${s.saveFileType}`);
  }

  const raw = s.getRaw();                   // GS-SP header removed internally
  const norm = s.normalizeSize(targetSize); // trim/pad to target size

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
