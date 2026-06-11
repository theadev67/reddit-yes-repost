/**
 * Image hashing
 * Implements aHash, dHash (horizontal) and dHash (vertical) with hash_size=16
 * 
 * All hashes are returned as Uint8Array bit-arrays (one element per bit, value
 * 0 or 1) so that Hamming distance is a simple element-wise XOR sum.
 */

'use strict';

const HASH_SIZE = 16;

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Resize an ImageBitmap/HTMLCanvasElement/HTMLImageElement into an offscreen
 * canvas and return its raw RGBA pixel data.
 * @param {CanvasImageSource} src
 * @param {number} w  target width in pixels
 * @param {number} h  target height in pixels
 * @returns {Uint8ClampedArray} RGBA flat array (length = w * h * 4)
 */
function resizeToPixels(src, w, h) {
  const oc = new OffscreenCanvas(w, h);
  const ctx = oc.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

/**
 * Convert RGBA pixel data to a flat grayscale (luminance) array.
 * Uses ITU-R BT.601 coefficients, same as PIL's .convert('L').
 * @param {Uint8ClampedArray} rgba
 * @returns {Float32Array}
 */
function toGray(rgba) {
  const n = rgba.length / 4;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

// ─── Hash functions ──────────────────────────────────────────────────────────

/**
 * Average Hash (aHash) - hash_size=16 -> 256-bit hash.
 *
 * Resize to 16x16, convert to grayscale, compare each pixel to the mean.
 * Matches imagehash.average_hash(img, hash_size=16).
 *
 * @param {CanvasImageSource} src
 * @returns {Uint8Array} 256-element bit array
 */
export function aHash(src) {
  const size = HASH_SIZE;
  const pixels = resizeToPixels(src, size, size);
  const gray = toGray(pixels);

  // Compute mean
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  const mean = sum / gray.length;

  const bits = new Uint8Array(size * size);
  for (let i = 0; i < gray.length; i++) {
    bits[i] = gray[i] > mean ? 1 : 0;
  }
  return bits;
}

/**
 * Difference Hash - horizontal (dHash) -- hash_size=16 -> 256-bit hash.
 *
 * Resize to (hash_size+1) x hash_size, compare adjacent pixels horizontally.
 * Matches imagehash.dhash(img, hash_size=16).
 *
 * @param {CanvasImageSource} src
 * @returns {Uint8Array} 256-element bit array
 */
export function dHashH(src) {
  const size = HASH_SIZE;
  const pixels = resizeToPixels(src, size + 1, size);
  const gray = toGray(pixels);

  const bits = new Uint8Array(size * size);
  let bit = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const left = gray[row * (size + 1) + col];
      const right = gray[row * (size + 1) + col + 1];
      bits[bit++] = left > right ? 1 : 0;
    }
  }
  return bits;
}

/**
 * Difference Hash - vertical (dHash_v) -- hash_size=16 -> 256-bit hash.
 *
 * Resize to hash_size x (hash_size+1), compare adjacent pixels vertically.
 * Matches imagehash.dhash_vertical(img, hash_size=16).
 *
 * @param {CanvasImageSource} src
 * @returns {Uint8Array} 256-element bit array
 */
export function dHashV(src) {
  const size = HASH_SIZE;
  const pixels = resizeToPixels(src, size, size + 1);
  const gray = toGray(pixels);

  const bits = new Uint8Array(size * size);
  let bit = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const top = gray[row * size + col];
      const bottom = gray[(row + 1) * size + col];
      bits[bit++] = top > bottom ? 1 : 0;
    }
  }
  return bits;
}

/**
 * Hamming distance between two bit arrays of equal length.
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {number}
 */
export function hammingDistance(a, b) {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

/**
 * Compute all three hashes and their Hamming distances between original and
 * attacked canvas sources.
 *
 * @param {CanvasImageSource} origSrc
 * @param {CanvasImageSource} attackSrc
 * @returns {{ ahash: number, dhash_h: number, dhash_v: number }}
 */
export function evaluateAttack(origSrc, attackSrc) {
  return {
    ahash:   hammingDistance(aHash(origSrc),   aHash(attackSrc)),
    dhash_h: hammingDistance(dHashH(origSrc),  dHashH(attackSrc)),
    dhash_v: hammingDistance(dHashV(origSrc),  dHashV(attackSrc)),
  };
}
