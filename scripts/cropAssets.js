import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = path.resolve('public/assets/aistudio/demo_e72485c9.png');
const outDir = path.resolve('public/assets/kingdom');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const metadata = await sharp(source).metadata();
  console.log('Source image metadata:', metadata.width, metadata.height);

  // 1. Hero banner in tablet:
  // Tablet left edge is ~22px, right edge ~1100px.
  // Sidebar is ~22px to 226px.
  // Content starts at x: 228px, banner top is ~85px, height is ~286px, width is ~852px.
  await sharp(source)
    .extract({ left: 228, top: 85, width: 852, height: 286 })
    .toFile(path.join(outDir, 'hero_banner.png'));
  console.log('Saved hero_banner.png');

  // 2. Sidebar mascot at bottom-left:
  // x: 28, y: 645, width: 196, height: 285
  await sharp(source)
    .extract({ left: 28, top: 645, width: 196, height: 285 })
    .toFile(path.join(outDir, 'sidebar_mascot.png'));
  console.log('Saved sidebar_mascot.png');

  // 3. School logo:
  // x: 236, top: 30, width: 58, height: 58
  await sharp(source)
    .extract({ left: 236, top: 30, width: 58, height: 58 })
    .toFile(path.join(outDir, 'school_logo.png'));
  console.log('Saved school_logo.png');

  // 4. Sidebar top title logo:
  // x: 28, top: 30, width: 196, height: 120
  await sharp(source)
    .extract({ left: 28, top: 30, width: 196, height: 120 })
    .toFile(path.join(outDir, 'sidebar_logo.png'));
  console.log('Saved sidebar_logo.png');

  // 5. Mobile mascot at bottom:
  // x: 1140, top: 760, width: 320, height: 155
  await sharp(source)
    .extract({ left: 1140, top: 760, width: 320, height: 155 })
    .toFile(path.join(outDir, 'mobile_mascot.png'));
  console.log('Saved mobile_mascot.png');
}

run().catch(console.error);
