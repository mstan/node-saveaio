// Inject a raw GBA save into a Wii U VC container (.bin) using the class API.
// Produces a new .bin file with the header and trailer preserved, payload replaced.
//
// Usage:
//   node example/class/gba_wiiu_inject.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileGBA } = require("node-saveaio");

async function main() {
  // Wii U bin container extracted with SaveMii for Megaman Battle Network 3 Blue
  const inputBin   = "./in/data_008_0000.bin";
  // A headerless raw save file (extracted or modified) to inject
  const payloadRaw = "./in/megaman_battle_network_3_blue.sav";
  // New injected container ready to be re-imported into Wii U VC
  const outputBin  = "./out/data_008_0000.bin";

  const container = await readFile(inputBin);
  const payload   = await readFile(payloadRaw);

  const s = new SaveFileGBA(container); // auto-detects on construct
  if (s.saveFileType !== "wii_u_virtual_console") {
    throw new Error(`Expected Wii U VC, got ${s.saveFileType}`);
  }

  // Exact behavior: header [0..0x4080) + payload + original tail
  const injected = s.injectRaw(payload);

  await mkdir(dirname(resolve(outputBin)), { recursive: true });
  await writeFile(outputBin, injected);

  console.log(`OK: injected payload (${payload.length} B) → ${outputBin} (size ${injected.length})`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
