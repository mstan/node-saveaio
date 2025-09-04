const {
  identifyNES_WiiU, decodeNES_WiiU, injectNES_WiiU,
} = require("../adapters/nes.wiiu.cjs");

class SaveFileNES {
  constructor(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError("SaveFileNES expects a Buffer");
    this.original = Buffer.from(buffer);
    this.type = null;           // internal enum
    this.saveFileType = null;   // public, test-inspected string
    this.payload = null;
  }

  async init() { this.detect(); return this; }

  detect() {
    if (this.type) return this.type;
    if (identifyNES_WiiU(this.original)) {
      this.type = "wiiu";
      this.saveFileType = "wii_u_virtual_console";
      this.payload = decodeNES_WiiU(this.original);
    } else {
      this.type = "raw";
      this.saveFileType = "raw";
      this.payload = Buffer.from(this.original);
    }
    return this.type;
  }

  getRaw() { if (!this.payload) this.detect(); return this.payload; }
  extractRaw() { return this.getRaw(); }

  injectRaw(rawBuf) {
    if (!Buffer.isBuffer(rawBuf)) throw new TypeError("injectRaw expects Buffer");
    if (!this.type) this.detect();
    if (this.type !== "wiiu") {
      throw new Error(`Injection not supported for type=${this.type}`);
    }
    return injectNES_WiiU(rawBuf, this.original);
  }

  getMetadata() {
    return { type: this.saveFileType || this.detect(), size: this.getRaw().length };
  }
}

module.exports = { SaveFileNES };
