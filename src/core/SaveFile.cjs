const { setSize, expandToNextPow2 } = require("../buffers/size.cjs");
const { trimTrailingZeros } = require("../buffers/whitespace.cjs");
const { swapEndian } = require("../buffers/endian.cjs");
const { swapWords } = require("../buffers/words.cjs");
const fs = require("node:fs/promises");

class SaveFile {
  constructor(saveBuffer) {
    if (!Buffer.isBuffer(saveBuffer)) throw new TypeError("SaveFile requires a Buffer.");
    this._buf = Buffer.from(saveBuffer);
  }

  inject(saveBuffer) { 
    if (!Buffer.isBuffer(saveBuffer)) throw new TypeError("inject requires a Buffer.");
    this._buf = Buffer.from(saveBuffer);
  }

  exportToMemory() { return Buffer.from(this._buf); }

  async exportToFile(filePath) {
    await fs.writeFile(filePath, this._buf);
    return filePath;
  }

  setSaveFileSize(bytes) { this._buf = setSize(this._buf, bytes); }
  expandSaveFileWhitespace() { this._buf = expandToNextPow2(this._buf); }
  trimSaveWhitespace() { this._buf = trimTrailingZeros(this._buf); }

  swapSaveFileEndian(bytes = 2) { this._buf = swapEndian(this._buf, bytes); }
  swapSaveFileWords(bytes = 2) { this._buf = swapWords(this._buf, bytes); }
}

module.exports = { SaveFile };