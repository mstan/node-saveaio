// Inject a raw SNES save into a Wii U VC container (.bin) using the class API.
// Preserves the original header; recomputes checksum; replaces only the payload.
//
// Usage:
//   node example/class/snes_wiiu_inject.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileSNES } = require("node-saveaio");

async function main() {
  // Wii U VC container extracted from a SNES title (e.g., via SaveMii)
  const inputBin   = "./in/KTR-UAAE.ves";
  // Headerless raw SNES SRAM you want to inject (e.g., .srm/.sav)
  const payloadRaw = "./in/super_mario_world.srm";
  // New injected container ready to re-import into the title
  const outputBin  = "./out/KTR-UAAE.ves";

  const container = await readFile(inputBin);
  const payload   = await readFile(payloadRaw);

  const s = new SaveFileSNES(container); // auto-detects on construct
  if (s.saveFileType !== "wii_u_virtual_console") {
    throw new Error(`Expected Wii U VC, got ${s.saveFileType}`);
  }

  // Exact behavior: copy/normalize header, recompute checksum, replace payload
  const injected = s.injectRaw(payload);

  await mkdir(dirname(resolve(outputBin)), { recursive: true });
  await writeFile(outputBin, injected);

  console.log(`OK: injected payload (${payload.length} B) → ${outputBin} (size ${injected.length})`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
