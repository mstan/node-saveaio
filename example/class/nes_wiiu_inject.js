// Inject a raw NES save into a Wii U VC container (.ves) using the class API.
// Preserves the 32-byte header and any trailer; replaces only the payload.
//
// Usage:
//   node example/class/nes_wiiu_inject.js
//

const { readFile, writeFile, mkdir } = require("fs/promises");
const { dirname, resolve } = require("path");
const { SaveFileNES } = require("node-saveaio");

async function main() {
  // Wii U .ves container extracted from Virtual Console title
  const inputVes   = "./in/WUP-FBAE.ves";
  // Headerless raw NES SRAM payload to inject (e.g., 8 KiB)
  const payloadRaw = "./in/legend_of_zelda.sav";
  // New injected .ves container ready to re-import
  const outputVes  = "./out/WUP-FBAE.ves";

  const container = await readFile(inputVes);
  const payload   = await readFile(payloadRaw);

  const s = new SaveFileNES(container); // auto-detects on construct
  if (s.saveFileType !== "wii_u_virtual_console") {
    throw new Error(`Expected Wii U VC, got ${s.saveFileType}`);
  }

  // Exact behavior: 32B header + payload + original trailer (if any)
  const injected = s.injectRaw(payload);

  await mkdir(dirname(resolve(outputVes)), { recursive: true });
  await writeFile(outputVes, injected);

  console.log(`OK: injected payload (${payload.length} B) → ${outputVes} (size ${injected.length})`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
