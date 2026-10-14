/**
 * XLY95-compatible BLE packet utilities.
 * Independent implementation based on publicly observable commands from
 * https://github.com/XLY95/xly95.github.io (inspected 2026-10-14).
 * No firmware flashing or undocumented configuration writes are performed.
 */
export const SERVICE_UUID = '32120001-0bf6-448a-9608-1b01a1a8f75c';
export const CHARACTERISTIC_UUID = '32120002-0bf6-448a-9608-1b01a1a8f75c';
export const COMMAND = Object.freeze({
  INFO: 0xA9,
  TIME: 0xA3,
  MODE: 0xAE,
  IMAGE_CHUNK: 0xA1,
  REFRESH: 0xA5,
});
export const SCREEN_SIZES = Object.freeze([
  { id: '4.2', width: 400, height: 300, name: '4.2″ · 400 × 300' },
  { id: '2.13', width: 122, height: 250, name: '2.13″ · 122 × 250' },
  { id: '7.5', width: 800, height: 480, name: '7.5″ · 800 × 480' },
]);

export function encodeTime(date = new Date()) {
  // XLY95 setTime() uses one big-endian Unix timestamp (four bytes).
  const seconds = Math.floor(date.getTime() / 1000);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 0xffffffff) {
    throw new RangeError('Date falls outside the supported 32-bit Unix time range');
  }
  return Uint8Array.of((seconds >>> 24) & 255, (seconds >>> 16) & 255,
    (seconds >>> 8) & 255, seconds & 255);
}

export function commandPacket(opcode, payload = []) {
  if (!Number.isInteger(opcode) || opcode < 0 || opcode > 255) {
    throw new RangeError('Opcode must be one byte');
  }
  return Uint8Array.of(opcode, ...payload);
}

/**
 * Prepare e-paper pixel planes from RGBA pixels.
 * 1 means white and 0 means black in the B/W plane.
 * For a red pixel, the RED plane bit is 0; otherwise 1.
 * Pack left-to-right, top-to-bottom, MSB first, with row padding.
 * This matches the source's blackWhiteColor / threeColor thresholds.
 */
export function packImage(imageData, triColor = true) {
  const {width, height, data} = imageData;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      !data || data.length !== width * height * 4) {
    throw new TypeError('Invalid RGBA image data');
  }
  const stride = Math.ceil(width / 8);
  const planeBytes = stride * height;
  // White is 1 in the original data format. Padding is white, too.
  const mono = new Uint8Array(planeBytes);
  const red = triColor ? new Uint8Array(planeBytes) : null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = (y * width + x) * 4;
      const r = data[pixel], g = data[pixel + 1], b = data[pixel + 2];
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const byte = y * stride + (x >> 3);
      const mask = 0x80 >>> (x & 7);
      if (luminance >= 140) mono[byte] |= mask;
      if (red && !(r > 160 && r > g && r > b)) red[byte] |= mask;
    }
    // Pad any partial byte with white, so no black stripe at the right edge.
    const trailing = width % 8;
    if (trailing) {
      const mask = (1 << (8 - trailing)) - 1;
      mono[y * stride + stride - 1] |= mask;
      if (red) red[y * stride + stride - 1] |= mask;
    }
  }
  return { width, height, mono, red, totalBytes: planeBytes * (triColor ? 2 : 1) };
}

/**
 * XLY95 writeImage sends A1, then a flag byte and pixel data.
 * 0x0F: first monochrome packet, 0xFF: continuation monochrome
 * 0x00: first red packet,        0xF0: continuation red.
 * maxWriteSize counts ALL characteristic bytes, including A1 and flags.
 */
export function* imagePackets(plane, colour = 'mono', maxWriteSize = 20) {
  if (!(plane instanceof Uint8Array)) throw new TypeError('Image plane must be Uint8Array');
  if (!Number.isInteger(maxWriteSize) || maxWriteSize < 3 || maxWriteSize > 512) {
    throw new RangeError('Invalid characteristic write size');
  }
  const chunkSize = maxWriteSize - 2;
  for (let offset = 0; offset < plane.length; offset += chunkSize) {
    const first = offset === 0;
    const flag = colour === 'red' ? (first ? 0x00 : 0xF0) : (first ? 0x0F : 0xFF);
    yield commandPacket(COMMAND.IMAGE_CHUNK, [flag, ...plane.subarray(offset, offset + chunkSize)]);
  }
}

export const bytesToHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
