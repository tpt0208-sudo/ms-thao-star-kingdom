import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = path.resolve('public/assets/aistudio/demo2full_0ffc2909.png');
const outDir = path.resolve('public/assets/kingdom');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const meta = await sharp(source).metadata();
  console.log('Image size:', meta.width, meta.height);

  // 1. Hero banner:
  // Tablet canvas left starts around 256px, banner is ~ x: 256, y: 76, width: 958, height: 256
  await sharp(source)
    .extract({ left: 256, top: 76, width: 958, height: 256 })
    .toFile(path.join(outDir, 'hero_banner_v2.png'));
  console.log('Saved hero_banner_v2.png');

  // 2. Sidebar bottom mascot:
  // x: 32, y: 690, width: 220, height: 236
  await sharp(source)
    .extract({ left: 32, top: 690, width: 220, height: 236 })
    .toFile(path.join(outDir, 'sidebar_mascot_v2.png'));
  console.log('Saved sidebar_mascot_v2.png');

  // 3. School Logo:
  // x: 264, top: 26, width: 52, height: 52
  await sharp(source)
    .extract({ left: 264, top: 26, width: 52, height: 52 })
    .toFile(path.join(outDir, 'school_logo_v2.png'));
  console.log('Saved school_logo_v2.png');

  // 4. Mobile phone mascot at bottom:
  // x: 1280, top: 760, width: 360, height: 140
  await sharp(source)
    .extract({ left: 1280, top: 760, width: 360, height: 140 })
    .toFile(path.join(outDir, 'mobile_mascot_v2.png'));
  console.log('Saved mobile_mascot_v2.png');
}

run().catch(console.error);
