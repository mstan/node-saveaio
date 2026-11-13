const test = require("node:test");
const assert = require("node:assert/strict");
const { inspectSaveRegion, convertSaveRegion } = require("../index.cjs");

function putSum16(data, offset) {
  let sum = 0;
  for (let i = 0; i < 0x1352; i += 2) sum += data.readUInt16BE(offset + i);
  data.writeUInt16BE(sum & 0xffff, offset + 0x1352);
}
function oot() {
  const data = Buffer.alloc(32768);
  Buffer.from("000000980910215a454c4441", "hex").copy(data);
  for (const n of [0, 3]) {
    const at = 0x20 + n * 0x1450;
    Buffer.from("ZELDAZ").copy(data, at + 0x1c);
    data.fill(0x3e, at + 0x24, at + 0x2c);
    data[at + 0x24] = 0x0a;
    data.writeUInt16BE(0x30, at + 0x2e);
    putSum16(data, at);
  }
  return data;
}
function reorder(data, mask) {
  return Buffer.from(data, 0, data.length).map((_, index) => data[index ^ mask]);
}
function putSum32(data, start, length, checksumAt) {
  data.writeUInt32LE(0, checksumAt); data.writeUInt32LE(0xffffffff, checksumAt + 4);
  let value = 0n;
  for (let i = start; i < start + length; i += 4) value += BigInt(data.readUInt32LE(i));
  const sum = Number(value & 0xffffffffn);
  data.writeUInt32LE(sum, checksumAt); data.writeUInt32LE((~sum) >>> 0, checksumAt + 4);
}
function zm() {
  const data = Buffer.alloc(32768, 0xff);
  for (const at of [0, 0x40, 0x6d40]) {
    data[at + 8] = 0x30; data[at + 9] = 0x31; data[at + 15] = 2;
    Buffer.from("ZeroMissionUSAver005").copy(data, at + 0x1c);
    putSum32(data, at, 64, at);
  }
  for (const n of [0, 3]) {
    const at = 0x80 + n * 0x1220;
    data.fill(0, at, at + 0x1220);
    Buffer.from("ZERO_MISSION_010").copy(data, at);
    data[at + 0x1a] = 2;
    Buffer.from("Planet Zebes... ").copy(data, at + 0x4f);
    Buffer.from(" - Samus Aran - ").copy(data, at + 0x250);
    data[at + 0x1200] = 0x53;
    putSum32(data, at, 0x1220, at + 0x10);
  }
  for (const at of [0x6dc0, 0x6e00]) {
    data.fill(0, at, at + 64); data[at] = 0x1f; data[at + 22] = 2;
    Buffer.from("_SELECT_LANGUAGE").copy(data, at + 6);
    Buffer.from("ENDKEY_LANGUAGE_").copy(data, at + 23);
    data.writeUInt16LE(0xffff, at + 4);
    let checksum = 0;
    for (let i = at; i < at + 64; i += 2) checksum = (checksum + data.readUInt16LE(i)) & 0xffff;
    data.writeUInt16LE(checksum, at + 2); data.writeUInt16LE(~checksum & 0xffff, at + 4);
  }
  return data;
}
const oo = { game: "oot-n64", fromRegion: "eu", toRegion: "us" };
const mz = { game: "metroid-zero-mission", fromRegion: "us", toRegion: "eu" };

test("OoT converts English header in all four orders, preserves every game record and input", () => {
  for (const [mask, order] of [[0, "be"], [1, "byte-swapped"], [2, "word-swapped"], [3, "le32"]]) {
    const source = reorder(oot(), mask), original = Buffer.from(source);
    assert.equal(inspectSaveRegion(source, { game: oo.game, region: "eu" }).byteOrder, order);
    const output = convertSaveRegion(source, oo), expected = Buffer.from(original);
    expected[2 ^ mask] = 1;
    assert.deepEqual(output, expected); assert.deepEqual(source, original);
    assert.notStrictEqual(output, source);
    assert.deepEqual(convertSaveRegion(output, { ...oo, fromRegion: "us", toRegion: "eu" }), original);
    assert.equal(inspectSaveRegion(output, { game: oo.game, region: "us" }).slots.filter(s => s.occupied).length, 2);
  }
});
test("OoT accepts an explicit destination order and preserves same-region language", () => {
  const source = oot(); source[2] = 2;
  assert.deepEqual(convertSaveRegion(source, { ...oo, toRegion: "eu" }), source);
  const output = convertSaveRegion(source, { ...oo, outputByteOrder: "le32" });
  assert.equal(output[1], 1);
  assert.equal(inspectSaveRegion(output, { game: oo.game, region: "us" }).byteOrder, "le32");
});
test("OoT rejects corrupt main/backup records, header, unknown alphabet and explicit wrong order", () => {
  for (const at of [0x20 + 0x90, 0x20 + 3 * 0x1450 + 0x90]) {
    const bad = oot(); bad[at] ^= 1;
    assert.throws(() => convertSaveRegion(bad, oo), /checksum/);
  }
  const header = oot(); header[8] ^= 1;
  assert.throws(() => convertSaveRegion(header, oo), /header/);
  const name = oot(); name[0x20 + 0x24] = 0x7f; putSum16(name, 0x20);
  assert.throws(() => convertSaveRegion(name, oo), /name character/);
  assert.throws(() => convertSaveRegion(oot(), { ...oo, inputByteOrder: "le32" }), /header/);
  assert.throws(() => convertSaveRegion(oot(), { ...oo, outputByteOrder: "unknown" }), /byte order/);
  assert.throws(() => convertSaveRegion(oot(), { ...oo, fromRegion: "us" }), /select English/);
});
test("Zero Mission rewrites all three authenticated headers, keeps progress/auxiliary bytes and round trips", () => {
  const source = zm(), original = Buffer.from(source);
  source[0x7f10] = 0x51; original[0x7f10] = 0x51;
  const output = convertSaveRegion(source, mz);
  const info = inspectSaveRegion(output, { game: mz.game, region: "eu" });
  assert.equal(info.slots.filter(s => s.occupied).length, 2);
  for (const at of [0, 0x40, 0x6d40]) {
    assert.equal(output[at + 15], 1);
    assert.equal(output.subarray(at + 0x1c, at + 0x30).toString(), "ZeroMissionEURver005");
  }
  assert.deepEqual(output.subarray(0x80, 0x6d40), source.subarray(0x80, 0x6d40));
  assert.deepEqual(output.subarray(0x6d80), source.subarray(0x6d80));
  assert.deepEqual(source, original); assert.notStrictEqual(output, source);
  assert.deepEqual(convertSaveRegion(output, { ...mz, fromRegion: "eu", toRegion: "us" }), source);
  assert.deepEqual(convertSaveRegion(source, { ...mz, toRegion: "us" }), source);
});
test("Zero Mission rejects each corrupt header and checksum complement, bad progress and wrong version/region", () => {
  for (const at of [0, 0x40, 0x6d40]) {
    const bad = zm(); bad[at + 0x0c] ^= 1;
    assert.throws(() => convertSaveRegion(bad, mz), /checksum/);
    const complement = zm(); complement[at + 4] ^= 1;
    assert.throws(() => convertSaveRegion(complement, mz), /checksum/);
  }
  const bad = zm(); bad[0x80 + 0x1200] ^= 1;
  assert.throws(() => convertSaveRegion(bad, mz), /slot 0 checksum/);
  const marker = zm(); marker[0x80] ^= 1;
  assert.throws(() => convertSaveRegion(marker, mz), /markers/);
  const version = zm(); version[0x1c + 19] = 0x36; putSum32(version, 0, 64, 0);
  assert.throws(() => convertSaveRegion(version, mz), /version/);
  assert.throws(() => convertSaveRegion(zm(), { ...mz, fromRegion: "eu" }), /region/);
  const language = zm(); language[0x80 + 0x1a] = 3; putSum32(language, 0x80, 0x1220, 0x90);
  assert.throws(() => convertSaveRegion(language, mz), /not English/);
  const globalLanguage = zm(); globalLanguage[0x6dc0 + 22] = 3;
  assert.throws(() => convertSaveRegion(globalLanguage, mz), /English language/);
});
test("Strict scope rejects unknown games, regions, containers, sizes and non-Buffers", () => {
  assert.throws(() => convertSaveRegion(oot(), { ...oo, game: "unknown" }), /Unsupported game/);
  assert.throws(() => convertSaveRegion(oot(), { ...oo, toRegion: "jp" }), /regions/);
  assert.throws(() => convertSaveRegion(Buffer.alloc(296960), oo), /raw 32 KiB/);
  assert.throws(() => convertSaveRegion(Buffer.alloc(32769), mz), /raw 32 KiB/);
  assert.throws(() => convertSaveRegion(new Uint8Array(32768), oo), /Buffer/);
  assert.throws(() => convertSaveRegion(Buffer.alloc(32768), oo), /header/);
  assert.throws(() => convertSaveRegion(Buffer.alloc(32768), mz), /region/);
  assert.throws(() => convertSaveRegion(zm(), { ...mz, outputByteOrder: "le32" }), /do not apply/);
});
test("ESM exposes the same conversion and inspection API as CommonJS", async () => {
  const esm = await import("../index.js");
  assert.strictEqual(esm.convertSaveRegion, convertSaveRegion);
  assert.strictEqual(esm.inspectSaveRegion, inspectSaveRegion);
});
