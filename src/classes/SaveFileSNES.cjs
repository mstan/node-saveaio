const {
  identifySNES_WiiU, decodeSNES_WiiU, injectSNES_WiiU,
} = require("../adapters/snes.wiiu.cjs");

const {
  identifySNES_3DS, decodeSNES_3DS, injectSNES_3DS,
} = require("../adapters/snes.3ds.cjs");

class SaveFileSNES {
  constructor(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError("SaveFileSNES expects a Buffer");
    this.original = Buffer.from(buffer);

    // Internal type:
    // - 'wiiu_and_3ds_vc'
    // - 'raw'
    this.type = null;
    this.saveFileType = null; // user-facing label
    this.payload = null;

    this.detect(); // eager init
  }

  async init() { this.detect(); return this; }

  detect() {
    if (this.type) return this.type;

    if (identifySNES_WiiU(this.original) || identifySNES_3DS(this.original)) {
      this.type = "wiiu_and_3ds_vc";
      this.saveFileType = "wii_u_and_3ds_virtual_console";
      // Structures are identical; use Wii U adapter as canonical
      this.payload = decodeSNES_WiiU(this.original);
    } else {
      this.type = "raw";
      this.saveFileType = "raw";
      this.payload = Buffer.from(this.original);
    }

    return this.type;
  }

  getRaw() {
    if (!this.payload) this.detect();
    return this.payload;
  }

  extractRaw() { return this.getRaw(); }

  /**
   * Inject raw payload back into its container (Wii U & 3DS supported).
   * Unknown header fields are preserved from the original container.
   *
   * @param {Buffer} rawBuf
   * @param {{presetIdLE?: number, sizeKiB?: number, debugChecksum?: boolean}} [opts]
   * @returns {Buffer} new container
   */
  injectRaw(rawBuf, opts = {}) {
    if (!Buffer.isBuffer(rawBuf)) throw new TypeError("injectRaw expects a Buffer");
    if (!this.type) this.detect();

    switch (this.type) {
      case "wiiu_and_3ds_vc":
        return injectSNES_WiiU(this.original, rawBuf, opts);
      default:
        throw new Error(`Injection not supported for type=${this.type}`);
    }
  }

  // Compatibility alias
  inject(rawBuf, opts) { return this.injectRaw(rawBuf, opts); }

  getMetadata() {
    return {
      type: this.saveFileType || this.detect(),
      size: this.getRaw().length,
    };
  }
}

module.exports = { SaveFileSNES };
