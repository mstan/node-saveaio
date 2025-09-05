// Extract raw GBA save from a GameShark / Action Replay non-SP container
// ("SharkPortSave"). Writes the headerless raw payload and a normalized 32 KiB
// variant.
//
// Usage:
//   node example/class/gba_gameshark_actionreplay_extract.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileGBA } = require("node-saveaio");

async function main() {
  // Example container filename (non-SP SharkPortSave)
  // Common extensions seen in the wild include .sps/.xps; adjust as needed.
  const inputGs = "./in/megaman_battle_network_3_blue_sharkport.sps";

  // Headerless raw save extracted from the SharkPort container
  const outputRaw = "./out/megaman_battle_network_3_blue_sharkport.raw.sav";

  // Normalized variant (trim/pad to the target size; default 32 KiB)
  const outputNormalized = "./out/megaman_battle_network_3_blue_sharkport.normalized.sav";
  const targetSize = 32768; // 32 KiB default

  const container = await readFile(inputGs);

  const s = new SaveFileGBA(container); // auto-detects on construct
  if (s.saveFileType !== "gameshark") {
    throw new Error(`Expected non-SP GameShark/Action Replay (SharkPortSave), got ${s.saveFileType}`);
  }

  const raw = s.getRaw();                   // SharkPort header removed internally
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
