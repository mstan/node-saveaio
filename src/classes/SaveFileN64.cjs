const { decodeDexDrive, encodeDexDrive, identifyN64_DexDrive } = require("../adapters/n64.dexdrive.cjs");
const { swapEndian } = require("../buffers/endian.cjs");
const { swapWords } = require("../buffers/words.cjs");

class SaveFileN64 {
  constructor(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError("SaveFileN64 expects a Buffer");
    this.original = buffer;
    this.type = null;
    this.payload = null;
  }

  detect() {
    if (this.type) return this.type;
    if (identifyN64_DexDrive(this.original)) {
      this.type = "dexdrive";
      this.payload = decodeDexDrive(this.original);
    } else {
      this.type = "raw";
      this.payload = Buffer.from(this.original);
    }
    return this.type;
  }

  extractRaw() {
    if (!this.payload) this.detect();
    return this.payload;
  }

  exportVariants() {
    const raw = this.extractRaw();
    const endian = swapEndian(raw, 2);
    const words = swapWords(raw, 2);
    const both = swapWords(endian, 2);
    return { raw, endian, words, both };
  }

  injectRaw(rawBuf) {
    if (!Buffer.isBuffer(rawBuf)) throw new TypeError("injectRaw expects Buffer");
    if (!this.type) this.detect();
    if (this.type !== "dexdrive") {
      throw new Error(`Injection only implemented for DexDrive type, not ${this.type}`);
    }
    return encodeDexDrive(rawBuf);
  }

  getMetadata() {
    return { type: this.type || this.detect(), size: this.extractRaw().length };
  }
}

module.exports = { SaveFileN64 };
