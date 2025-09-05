// GameBoy Advance savefile wrapper with container auto-detection.
//
// Supported:
//   - GameShark SP  ("ADVSAVEG")
//   - Wii U VC
//   - Raw
// Unsupported (will throw):
//   - Action Replay / XPS (non-SP SharkPortSave)
//
// Note: We detect SharkPortSave containers, but if the filename ends
//       with ".xps" we explicitly throw "unsupported".

const {
  identifyGBA_GSSP, decodeGBA_GSSP, injectGBA_GSSP,
} = require("../adapters/gba.gssp.cjs");

const {
  identifyGBA_GS, decodeGBA_GS, injectGBA_GS,
} = require("../adapters/gba.gs.cjs");

const {
  identifyGBA_WiiU, decodeGBA_WiiU, injectGBA_WiiU,
} = require("../adapters/gba.wiiu.cjs");

const { extname } = require("path");

const KB = 1024;

class SaveFileGBA {
  constructor(buffer, filename = null) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError("SaveFileGBA expects a Buffer");
    this.original = Buffer.from(buffer);
    this.type = null;           // 'gssp' | 'gs' | 'wiiu' | 'raw'
    this.saveFileType = null;   // 'gameshark_sp' | 'gameshark' | 'wii_u_virtual_console' | 'raw'
    this.payload = null;        // decoded raw save data (Buffer)
    this._gsLazy = false;       // only true for GS to defer parse-time throws
    this._filename = filename;  // optional, for extension check
    this.detect();              // detection + eager decode (except GS)
  }

  async init() { this.detect(); return this; }

  detect() {
    if (this.type) return this.type;

    if (identifyGBA_GSSP(this.original)) {
      this.type = "gssp";
      this.saveFileType = "gameshark_sp";
      this.payload = decodeGBA_GSSP(this.original);
      this._gsLazy = false;
    } else if (identifyGBA_GS(this.original)) {
      // Check extension — if .xps, declare unsupported
      if (this._filename && extname(this._filename).toLowerCase() === ".xps") {
        throw new Error("Action Replay (.xps) is unsupported");
      }
      this.type = "gs";
      this.saveFileType = "gameshark";
      this.payload = null; // lazy decode
      this._gsLazy = true;
    } else if (identifyGBA_WiiU(this.original)) {
      this.type = "wiiu";
      this.saveFileType = "wii_u_virtual_console";
      this.payload = decodeGBA_WiiU(this.original);
      this._gsLazy = false;
    } else {
      this.type = "raw";
      this.saveFileType = "raw";
      this.payload = Buffer.from(this.original);
      this._gsLazy = false;
    }
    return this.type;
  }

  getRaw() {
    if (this._gsLazy && this.type === "gs" && this.payload == null) {
      this.payload = decodeGBA_GS(this.original); // may throw if corrupted
      this._gsLazy = false;
    }
    if (!this.payload) this.detect();
    return this.payload;
  }
  extractRaw() { return this.getRaw(); }

  injectRaw(rawBuf) {
    if (!Buffer.isBuffer(rawBuf)) throw new TypeError("injectRaw expects a Buffer");
    if (!this.type) this.detect();

    switch (this.type) {
      case "gssp":
        return injectGBA_GSSP(this.original, rawBuf);
      case "gs":
        return injectGBA_GS(this.original, rawBuf);
      case "wiiu":
        return injectGBA_WiiU(this.original, rawBuf);
      default:
        throw new Error(`Injection not supported for type=${this.type}`);
    }
  }
  inject(rawBuf) { return this.injectRaw(rawBuf); }

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
    const tmp = new SaveFileGBA(Buffer.from(buf));
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
