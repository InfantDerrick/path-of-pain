/**
 * Single source of truth for the Path of Pain app mark.
 *
 * The mark is a switchback trail climbing toward an ember: the long grind of a
 * job hunt, with one lit marker at the end of it.
 *
 * Regenerate with:  pnpm --filter @jobtracker/web icons:generate
 * Requires `sharp` to be resolvable (see NODE_PATH note in the package script).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const INK = "#1a1612";
const PARCHMENT = "#efe6d8";
const EMBER = "#c2410c";

/** Trail + ember, drawn on a 512 grid and nudged so its bounds sit centered. */
function mark({ color = PARCHMENT, ember = EMBER } = {}) {
  return `<g transform="translate(0 -6)">
    <path d="M108 404 L200 404 L200 316 L292 316 L292 228 L384 228" fill="none" stroke="${color}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="384" cy="140" r="42" fill="${ember}"/>
  </g>`;
}

/** Rounded tile used for the favicon and the manifest "any" icons. */
function tileIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="${INK}"/>
  ${mark()}
</svg>`;
}

/**
 * Full-bleed square. Android masks maskable icons to a circle of 80% width, so
 * the mark is scaled to stay inside that safe zone.
 */
function fullBleedIcon(scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${INK}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${mark()}</g>
</svg>`;
}

/** Single-colour silhouette for Android themed icons. */
function monochromeIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(256 256) scale(0.82) translate(-256 -256)">${mark({ color: "#000000", ember: "#000000" })}</g>
</svg>`;
}

const svgFiles = {
  "icon.svg": tileIcon(),
  "maskable-icon.svg": fullBleedIcon(0.82),
  "monochrome-icon.svg": monochromeIcon(),
};

const pngFiles = [
  { name: "icon-192.png", svg: tileIcon(), size: 192 },
  { name: "icon-512.png", svg: tileIcon(), size: 512 },
  { name: "maskable-icon-192.png", svg: fullBleedIcon(0.82), size: 192 },
  { name: "maskable-icon-512.png", svg: fullBleedIcon(0.82), size: 512 },
  // iOS applies its own mask and composites on black, so this one is opaque.
  { name: "apple-touch-icon.png", svg: fullBleedIcon(0.86), size: 180 },
];

await mkdir(publicDir, { recursive: true });

for (const [name, contents] of Object.entries(svgFiles)) {
  await writeFile(join(publicDir, name), `${contents}\n`, "utf8");
  console.info(`wrote ${name}`);
}

for (const { name, svg, size } of pngFiles) {
  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(publicDir, name), buffer);
  console.info(`wrote ${name} (${size}x${size})`);
}
