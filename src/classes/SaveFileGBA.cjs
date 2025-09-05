// GameBoy Advance savefile wrapper with container auto-detection.
// Supports: GameShark SP (GSSP), non-SP SharkPortSave (GS), Wii U VC container, and raw.

const {
  identifyGBA_GSSP, decodeGBA_GSSP, injectGBA_GSSP,
} = require("../adapters/gba.gssp.cjs");

const {
  identifyGBA_GS, decodeGBA_GS, /* injectGBA_GS (not used here yet) */
} = require("../adapters/gba.gs.cjs");

const {
  identifyGBA_WiiU, decodeGBA_WiiU, injectGBA_WiiU,
} = require("../adapters/gba.wiiu.cjs"); // adjust if your WiiU adapter path differs

const KB = 1024;

class SaveFileGBA {
  constructor(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError("SaveFileGBA expects a Buffer");
    this.original = Buffer.from(buffer);
    this.type = null;           // 'gssp' | 'gs' | 'wiiu' | 'raw'
    this.saveFileType = null;   // 'gameshark_sp' | 'gameshark' | 'wii_u_virtual_console' | 'raw'
    this.payload = null;        // decoded raw save data (Buffer) — may be lazy for GS
    this._needsLazyDecode = false; // only true for GS to defer parse-time throws
    this.detect();              // set type + maybe eager-decode
  }

  async init() { this.detect(); return this; }

  detect() {
    if (this.type) return this.type;

    if (identifyGBA_GSSP(this.original)) {
      this.type = "gssp";
      this.saveFileType = "gameshark_sp";
      // Eager decode (keeps existing behavior/tests)
      this.payload = decodeGBA_GSSP(this.original);
      this._needsLazyDecode = false;
    } else if (identifyGBA_GS(this.original)) {
      this.type = "gs";
      this.saveFileType = "gameshark";
      // Lazy decode for GS so constructor doesn't throw on malformed files.
      // We'll actually parse when getRaw() is called.
      this.payload = null;
      this._needsLazyDecode = true;
    } else if (identifyGBA_WiiU(this.original)) {
      this.type = "wiiu";
      this.saveFileType = "wii_u_virtual_console";
      // Eager decode (matches prior behavior/tests)
      this.payload = decodeGBA_WiiU(this.original);
      this._needsLazyDecode = false;
    } else {
      this.type = "raw";
      this.saveFileType = "raw";
      this.payload = Buffer.from(this.original);
      this._needsLazyDecode = false;
    }
    return this.type;
  }

  getRaw() {
    // Perform deferred GS decode here so tests can assert throws on getRaw()
    if (this._needsLazyDecode && this.type === "gs" && this.payload == null) {
      // Will throw here on corrupted containers (as the test expects)
      this.payload = decodeGBA_GS(this.original);
      this._needsLazyDecode = false;
    }
    if (!this.payload) this.detect();
    return this.payload;
  }
  extractRaw() { return this.getRaw(); }

  // Re-encodes the current container with a new raw save (where supported)
  injectRaw(rawBuf) {
    if (!Buffer.isBuffer(rawBuf)) throw new TypeError("injectRaw expects a Buffer");
    if (!this.type) this.detect();

    switch (this.type) {
      case "gssp":
        return injectGBA_GSSP(this.original, rawBuf);
      // NOTE: GS injection is intentionally not wired yet per your rollback.
      // case "gs":
      //   return injectGBA_GS(this.original, rawBuf);
      case "wiiu":
        return injectGBA_WiiU(this.original, rawBuf);
      default:
        throw new Error(`Injection not supported for type=${this.type}`);
    }
  }
  inject(rawBuf) { return this.injectRaw(rawBuf); }

  /**
   * Normalize the current raw payload to a specific size (defaults to 32 KiB).
   */
  normalizeSize(targetBytes = 32 * KB, opts = {}) {
    const padByte = Number.isInteger(opts.padByte) ? (opts.padByte & 0xFF) : 0xFF;
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

  static normalizeSize(buf, targetBytes = 32 * KB, opts = {}) {
    if (!Buffer.isBuffer(buf)) throw new TypeError("normalizeSize(buf): Buffer required");
    const tmp = new SaveFileGBA(Buffer.from(buf)); // not a container → stays 'raw'
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
