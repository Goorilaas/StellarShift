/**
 * Regenerate Android adaptive-icon FOREGROUND so the elaborate
 * StellarShift logo (orbits + stars) survives launcher squircle masking.
 *
 * Problem we're fixing: stock `android-icon-foreground.png` was a copy
 * of the full-bleed icon. Launcher squircle masks crop ~17% off each
 * edge, so on Samsung One UI / Pixel circle the orbits & stars vanished
 * and only the central blob remained.
 *
 * Solution: scale the design content to 80% of canvas (1024 → 819) on a
 * transparent 1024×1024 background, then regenerate the per-density
 * webp mipmaps Android consumes at install time.
 *
 * What this script TOUCHES:
 *   - assets/images/android-icon-foreground.png  (overwritten with scaled version)
 *   - android/app/src/main/res/mipmap-DPI/ic_launcher_foreground.webp  (5 densities)
 *
 * What it does NOT touch:
 *   - assets/images/icon.png (legacy non-adaptive icon — full design intentionally)
 *   - assets/images/splash-icon.png (splash screen — full design intentionally)
 *   - assets/images/android-icon-background.png (adaptive bg — independent)
 *   - mipmap-DPI/ic_launcher.webp + ic_launcher_round.webp (legacy Android <8 — full design)
 *   - mipmap-DPI/ic_launcher_background.webp + ic_launcher_monochrome.webp
 *
 * Usage:
 *   node scripts/regen-adaptive-foreground.js
 *
 * After run: rebuild APK / EAS so Android packs the new mipmaps.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_PNG = path.join(ROOT, 'assets/images/android-icon-foreground.png');
const SRC_BACKUP = path.join(ROOT, 'assets/images/android-icon-foreground.original.png');

const SCALE = 0.80;            // 80% of canvas → safe for adaptive icon mask
const CANVAS_SIZE = 1024;      // master PNG dimensions
const CONTENT_SIZE = Math.round(CANVAS_SIZE * SCALE); // 819

const DENSITIES = [
    { dpi: 'mdpi',    px: 108 },
    { dpi: 'hdpi',    px: 162 },
    { dpi: 'xhdpi',   px: 216 },
    { dpi: 'xxhdpi',  px: 324 },
    { dpi: 'xxxhdpi', px: 432 },
];

async function main() {
    console.log('→ Reading source foreground PNG...');
    const inputBuffer = fs.readFileSync(SRC_PNG);

    // Backup the original ONCE — if we re-run, don't double-shrink.
    if (!fs.existsSync(SRC_BACKUP)) {
        fs.writeFileSync(SRC_BACKUP, inputBuffer);
        console.log(`  Backup saved: ${path.basename(SRC_BACKUP)}`);
    } else {
        console.log(`  Backup already exists, re-using as source: ${path.basename(SRC_BACKUP)}`);
    }

    // ALWAYS read from backup so SCALE applies to the original full-bleed design,
    // not to an already-shrunk one.
    const sourceBuffer = fs.readFileSync(SRC_BACKUP);

    console.log(`→ Scaling content to ${CONTENT_SIZE}×${CONTENT_SIZE} on transparent ${CANVAS_SIZE}×${CANVAS_SIZE} canvas...`);
    const scaled = await sharp(sourceBuffer)
        .resize(CONTENT_SIZE, CONTENT_SIZE, { fit: 'inside' })
        .toBuffer();

    const padded = await sharp({
        create: {
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: scaled, gravity: 'center' }])
        .png()
        .toBuffer();

    fs.writeFileSync(SRC_PNG, padded);
    console.log(`  Wrote: ${path.basename(SRC_PNG)}`);

    console.log('→ Generating per-density webp mipmaps...');
    for (const { dpi, px } of DENSITIES) {
        const target = path.join(
            ROOT,
            `android/app/src/main/res/mipmap-${dpi}/ic_launcher_foreground.webp`
        );
        await sharp(padded)
            .resize(px, px)
            .webp({ quality: 90 })
            .toFile(target);
        console.log(`  ${dpi.padEnd(8)} → ${px}×${px}  ${path.relative(ROOT, target)}`);
    }

    console.log('\n✅ Done. Rebuild APK / run `eas build` to ship the new icon.');
    console.log('   To revert: copy assets/images/android-icon-foreground.original.png');
    console.log('   over .png and re-run prebuild.');
}

main().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
