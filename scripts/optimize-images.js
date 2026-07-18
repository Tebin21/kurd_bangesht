// One-off asset pipeline: generates WebP/AVIF derivatives of the source
// PNGs at native resolution (no resize, so output is pixel-equivalent —
// only the compression format changes). Re-run after replacing any of
// the source PNGs. Requires devDependency "sharp" (npm install first).
const sharp = require('sharp');
const path = require('path');

const root = path.join(__dirname, '..');

const images = [
  { src: 'teb.png', base: 'teb', alpha: false },
  { src: 'rayan.png', base: 'rayan', alpha: true },
  { src: 'flow up left.png', base: 'flow-up-left', alpha: true },
  { src: 'flow dawn right.png', base: 'flow-dawn-right', alpha: true },
];

async function run() {
  for (const img of images) {
    const input = path.join(root, img.src);
    const webpOut = path.join(root, img.base + '.webp');
    const avifOut = path.join(root, img.base + '.avif');

    await sharp(input).webp({ quality: 90, effort: 6 }).toFile(webpOut);
    await sharp(input).avif({ quality: 55, effort: 6 }).toFile(avifOut);

    const fs = require('fs');
    const origSize = fs.statSync(input).size;
    const webpSize = fs.statSync(webpOut).size;
    const avifSize = fs.statSync(avifOut).size;
    console.log(
      `${img.src}: ${origSize} -> webp ${webpSize} (${Math.round((1 - webpSize / origSize) * 100)}% smaller), avif ${avifSize} (${Math.round((1 - avifSize / origSize) * 100)}% smaller)`
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
