// index.js
import lib from "./src/lib.cjs";

export const SaveFile = lib.SaveFile;

// Buffer helpers
export const swapEndian = lib.swapEndian;
export const swapWords = lib.swapWords;
export const trimTrailingZeros = lib.trimTrailingZeros;
export const setSize = lib.setSize;
export const expandToNextPow2 = lib.expandToNextPow2;

// N64
export const decodeDexDrive       = lib.decodeDexDrive;
export const encodeDexDrive       = lib.encodeDexDrive;
export const identifyN64_DexDrive = lib.identifyN64_DexDrive;

// GBA (by implementation)
export const identifyGBA_GSSP = lib.identifyGBA_GSSP;
export const decodeGBA_GSSP   = lib.decodeGBA_GSSP;
export const injectGBA_GSSP   = lib.injectGBA_GSSP;

export const identifyGBA_GS   = lib.identifyGBA_GS;
export const decodeGBA_GS     = lib.decodeGBA_GS;
export const injectGBA_GS     = lib.injectGBA_GS; // newly exposed

// GBA Wii U VC
export const decodeGBA_WiiU    = lib.decodeGBA_WiiU;
export const injectGBA_WiiU    = lib.injectGBA_WiiU;
export const identifyGBA_WiiU  = lib.identifyGBA_WiiU;

// NES Wii U VC
export const decodeNES_WiiU    = lib.decodeNES_WiiU;
export const injectNES_WiiU    = lib.injectNES_WiiU;
export const identifyNES_WiiU  = lib.identifyNES_WiiU;

// SNES Wii U VC
export const decodeSNES_WiiU   = lib.decodeSNES_WiiU;
export const injectSNES_WiiU   = lib.injectSNES_WiiU;
export const identifySNES_WiiU = lib.identifySNES_WiiU;

// SNES 3DS VC
export const decodeSNES_3DS    = lib.decodeSNES_3DS;
export const injectSNES_3DS    = lib.injectSNES_3DS;
export const identifySNES_3DS  = lib.identifySNES_3DS;

// Classes
export const SaveFileGBA  = lib.SaveFileGBA;
export const SaveFileNES  = lib.SaveFileNES;
export const SaveFileSNES = lib.SaveFileSNES;
export const SaveFileN64  = lib.SaveFileN64;

// Default export
export default lib;
