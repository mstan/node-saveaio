const {
  identifySNES_WiiU, decodeSNES_WiiU,
} = require("../adapters/snes.wiiu.cjs");

const {
  identifySNES_3DS, decodeSNES_3DS,
} = require("../adapters/snes.3ds.cjs");

class SaveFileSNES {
  constructor(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError("SaveFileSNES expects a Buffer");
    this.original = Buffer.from(buffer);
    this.type = null;
    this.saveFileType = null; // for tests
    this.payload = null;
    this.detect(); // eager so property reads work without awaiting init()
  }

  async init() { this.detect(); return this; }

  detect() {
    if (this.type) return this.type;

    if (identifySNES_WiiU(this.original)) {
      this.type = "wiiu";
      this.saveFileType = "wii_u_virtual_console";
      this.payload = decodeSNES_WiiU(this.original);
    } else if (identifySNES_3DS(this.original)) {
      this.type = "3ds";
      this.saveFileType = "nintendo_3ds";
      this.payload = decodeSNES_3DS(this.original);
    } else {
      this.type = "raw";
      this.saveFileType = "raw";
      this.payload = Buffer.from(this.original);
    }
    return this.type;
  }

  getRaw() { if (!this.payload) this.detect(); return this.payload; }
  extractRaw() { return this.getRaw(); }

  injectRaw(_) {
    if (!this.type) this.detect();
    throw new Error("Not implemented: SNES reinjection (Wii U / 3DS) is not supported.");
  }

  // Some tests call `s.inject(...)` and expect a “not implemented” throw:
  inject(_) {
    throw new Error("Not implemented: SNES reinjection (Wii U / 3DS) is not supported.");
  }

  getMetadata() {
    return { type: this.saveFileType || this.detect(), size: this.getRaw().length };
  }
}

module.exports = { SaveFileSNES };
