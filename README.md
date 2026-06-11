# reddit-yes-repost

A fast, non-ML perceptual hash evasion tool packaged as a Chrome/Chromium browser extension. This project is designed for technical research and education regarding the robustness of perceptual image hashing algorithms, specifically focusing on fast duplication detection tools like RedditRepostSleuth.

## Features

- **Interactive Tuning:** Enable/disable individual attack vectors and control their intensity via UI sliders.
- **Visual Comparison:** Real-time side-by-side preview of the original and perturbed images.
- **Hamming Distance Calculator:** Immediate display of Hamming distance scores on `ahash`, `dhash (horizontal)` and `dhash (vertical)` to evaluate the effectiveness of the evasion.

---

## Technical Details

Image hashing algorithms are widely used for content identification and duplicate detection. This project demonstrates that these algorithms can be easily evaded using resource-efficient, non-ML geometric and pixel-level transformations.

### Hash Algorithms Targeted
The tool targets the standard 256-bit configuration (`hash_size=16` resulting in a 16x16 grid) of three primary algorithms:
1. **Average Hash (aHash):** Resizes the image to 16x16, grayscales it, and compares each pixel's luminance to the mean luminance of all pixels.
2. **Difference Hash Horizontal (dHash-H):** Resizes the image to 17x16, grayscales it, and compares the relative luminance between horizontally adjacent pixels.
3. **Difference Hash Vertical (dHash-V):** Resizes the image to 16x17, grayscales it, and compares the relative luminance between vertically adjacent pixels.

### Attack Mechanisms
To disrupt these hashes with minimal degradation to human-perceivable image quality, the tool combines several lightweight transformations:

1. **Macro Blobs (aHash Evasion):**
   * Generates 6 to 18 random, overlapping 2D luminance blobs across the image.
   * Applies localized, smooth brightness shifts using a quadratic ease-in-out falloff.
   * Disrupts the global average luminance, skewing the threshold calculations of aHash.
2. **High-Frequency Noise (dHash Evasion):**
   * Injects subtle, high-frequency pixel noise throughout the image.
   * Alters the gradient relationships between adjacent pixels, directly targeting the difference-based comparison logic of dHash.
3. **Geometric Perturbations:**
   * **Shift Center:** Translates the image coordinates slightly (up to 8 percent of the dimensions).
   * **Slight Rotation:** Rotates the image by a small angle (up to 8 degrees).
   * **Distort Scale:** Warps the aspect ratio slightly using non-uniform scaling (up to 10 percent scale variance between X and Y axes).
   * **Auto-Zoom & Crop:** Intelligently zooms in and crops the rotated/shifted image to eliminate dark borders or padding artifacts, keeping the frame clean.

---

## Project Structure

- `extension/`: The complete Chromium extension source code.
  * `manifest.json`: Configuration manifest (Manifest V3) for the Chrome extension.
  * `popup.html` & `popup.js`: The user interface and attack processing loop.
  * `index.css`: Styling for the extension's dashboard.
  * `hasher.js`: JavaScript implementation of aHash, dHash, and Hamming distance calculation.
  * `background.js`: Service worker handling extension initialization.
- `asset/`: Test images, UI screenshots, and credits.
- `result/`: Evaluated sample outputs showing successful evasion.

---

## Installation and Usage

### Browser Extension (Interactive UI)

To run the interactive evasion tool in Chrome, Chromium, or Brave:

1. Clone or download this repository.
2. Open your browser and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `extension/` directory from this project.
6. Click the extension icon in your toolbar (or pin it and click it) to open the interface in a new tab.
7. Upload an image, adjust the sliders to your preference, click **Apply Attack**, and click **Download Result** to save the modified image.


## Why This Project Exists

This tool was not created simply out of frustration over removed Reddit memes. Instead, it serves a research objective:

* **Fragility of Perceptual Hashing:** Perceptual hashing is heavily relied upon by online platforms for content moderation, duplicate detection, and automated copyright filtering. However, these algorithms are fragile.
* **Accessibility of Adversarial Techniques:** While advanced machine learning models can generate adversarial perturbations that are entirely imperceptible, they require significant computational power and expertise. This project shows that basic, resource-efficient, non-ML algorithms can achieve similar evasion success in milliseconds using standard web APIs.
* **Raising Awareness:** There is a lack of general awareness regarding how easily standard image hashing detection pipelines can be bypassed.
* **Transparency and Openness:** With the rise of LLMs and AI coding assistants, anyone can build a similar evasion tool in a matter of days. By releasing this tool openly, we promote transparency, allowing developers and platforms to understand these vulnerabilities and build more resilient detection mechanisms.

---

## Disclaimer

For educational and technical research purposes only. Users should respect the Terms of Service of RedditRepostSleuth, Reddit, and other third party websites or services. This project is in no way intended to be used for malicious purposes. This project is in no way affiliated with RedditRepostSleuth, Reddit, or any other third party websites or services. The author assumes no responsibility for any misuse of this project.
