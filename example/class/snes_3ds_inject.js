// Inject a raw SNES save into a 3DS VC container (.ves) using the class API.
// Preserves the original header; recomputes checksum; replaces only the payload.
//
// Usage:
//   node example/class/snes_3ds_inject.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileSNES } = require("node-saveaio");

async function main() {
  // 3DS VC container for a SNES title (exported with a save manager)
  const inputVes   = "./in/KTR-UAAE.ves.ves"; // example: Super Mario World
  // Headerless raw SNES SRAM you want to inject (e.g., .srm/.sav)
  const payloadRaw = "./in/super mario world.srm";
  // New injected container ready to re-import
  const outputVes  = "./out/KTR-UAAE.injected.ves";

  const container = await readFile(inputVes);
  const payload   = await readFile(payloadRaw);

  const s = new SaveFileSNES(container); // auto-detects on construct
  if (s.saveFileType !== "nintendo_3ds") {
    throw new Error(`Expected Nintendo 3DS, got ${s.saveFileType}`);
  }

  // Exact behavior: copy/normalize header, recompute checksum, replace payload
  const injected = s.injectRaw(payload);

  await mkdir(dirname(resolve(outputVes)), { recursive: true });
  await writeFile(outputVes, injected);

  console.log(`OK: injected payload (${payload.length} B) → ${outputVes} (size ${injected.length})`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
