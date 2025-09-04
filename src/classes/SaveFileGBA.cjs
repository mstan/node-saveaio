const {
  identifyGBA_GSSP, decodeGBA_GSSP, injectGBA_GSSP,
} = require("../adapters/gba.gssp.cjs");

const {
  identifyGBA_GS, decodeGBA_GS,
} = require("../adapters/gba.gs.cjs");

const {
  identifyGBA_WiiU, decodeGBA_WiiU, injectGBA_WiiU,
} = require("../adapters/gba.wiiu.cjs");

const KB = 1024;

class SaveFileGBA {
  constructor(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError("SaveFileGBA expects a Buffer");
    this.original = Buffer.from(buffer);
    this.type = null;           // 'gssp' | 'gs' | 'wiiu' | 'raw'
    this.saveFileType = null;   // label: 'gameshark_sp' | 'gameshark' | 'wii_u_virtual_console' | 'raw'
    this.payload = null;        // decoded raw save data
    this.detect();              // eager detect so props are usable immediately
  }

  async init() { this.detect(); return this; }

  detect() {
    if (this.type) return this.type;

    if (identifyGBA_GSSP(this.original)) {
      this.type = "gssp";
      this.saveFileType = "gameshark_sp";
      this.payload = decodeGBA_GSSP(this.original);
    } else if (identifyGBA_GS(this.original)) {
      this.type = "gs";
      this.saveFileType = "gameshark";
      this.payload = decodeGBA_GS(this.original); // may throw if not implemented
    } else if (identifyGBA_WiiU(this.original)) {
      this.type = "wiiu";
      this.saveFileType = "wii_u_virtual_console";
      this.payload = decodeGBA_WiiU(this.original);
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
    if (!Buffer.isBuffer(rawBuf)) throw new TypeError("injectRaw expects a Buffer");
    if (!this.type) this.detect();

    switch (this.type) {
      case "gssp":
        return injectGBA_GSSP(this.original, rawBuf);
      case "wiiu":
        return injectGBA_WiiU(this.original, rawBuf);
      default:
        throw new Error(`Injection not supported for type=${this.type}`);
    }
  }
  inject(rawBuf) { return this.injectRaw(rawBuf); }

  /**
   * Normalize the current raw payload to a specific size (defaults to 32 KiB).
   * - If raw === target: returns a copy.
   * - If raw > target:
   *     * If raw >= 2*target: compare density of the first two target-sized blocks; pick denser.
   *     * Else: truncate to target.
   * - If raw < target: pad with padByte (default 0xFF) to reach target.
   *
   * Rationale: many tools prefer 32 KiB, but some games legitimately use 64/128 KiB.
   * This method is a pragmatic fitter, not a claim about the game’s native save size.
   *
   * @param {number} [targetBytes=32*1024]
   * @param {{padByte?: number}} [opts]
   * @returns {Buffer} normalized buffer of length targetBytes
   */
  normalizeSize(targetBytes = 32 * KB, opts = {}) {
    const padByte = Number.isInteger(opts.padByte) ? opts.padByte & 0xFF : 0xFF;
    const src = this.getRaw();

    if (src.length === targetBytes) {
      return Buffer.from(src);
    }

    if (src.length > targetBytes) {
      if (src.length >= 2 * targetBytes) {
        const a = src.subarray(0, targetBytes);
        const b = src.subarray(targetBytes, 2 * targetBytes);
        return Buffer.from(SaveFileGBA._density(b) > SaveFileGBA._density(a) ? b : a);
      }
      return Buffer.from(src.subarray(0, targetBytes));
    }

    const out = Buffer.alloc(targetBytes, padByte);
    src.copy(out, 0, 0, src.length);
    return out;
  }

  /** Static convenience: normalize an arbitrary buffer (no instance needed). */
  static normalizeSize(buf, targetBytes = 32 * KB, opts = {}) {
    if (!Buffer.isBuffer(buf)) throw new TypeError("normalizeSize(buf): Buffer required");
    const tmp = new SaveFileGBA(Buffer.from(buf)); // will set payload=buf since not a container
    tmp.payload = Buffer.from(buf);
    return tmp.normalizeSize(targetBytes, opts);
  }

  static _density(buf) {
    let c = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i];
      if (v !== 0x00 && v !== 0xFF) c++;
    }
    return c / (buf.length || 1);
  }

  getMetadata() {
    return { type: this.saveFileType || this.detect(), size: this.getRaw().length };
  }
}

module.exports = { SaveFileGBA };
