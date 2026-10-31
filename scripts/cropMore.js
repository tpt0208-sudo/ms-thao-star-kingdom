import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = path.resolve('public/assets/aistudio/demo_e72485c9.png');
const outDir = path.resolve('public/assets/kingdom');

async function extractMore() {
  // Navigation 8 cards in grid
  // Grid row is roughly y: 388, height: 114
  const cards = [
    { name: 'nav_home.png', left: 238, top: 388, width: 98, height: 114 },
    { name: 'nav_news.png', left: 344, top: 388, width: 98, height: 114 },
    { name: 'nav_teams.png', left: 450, top: 388, width: 98, height: 114 },
    { name: 'nav_students.png', left: 556, top: 388, width: 98, height: 114 },
    { name: 'nav_rewards.png', left: 662, top: 388, width: 98, height: 114 },
    { name: 'nav_halloffame.png', left: 768, top: 388, width: 98, height: 114 },
    { name: 'nav_randompicker.png', left: 874, top: 388, width: 98, height: 114 },
    { name: 'nav_library.png', left: 980, top: 388, width: 98, height: 114 },
  ];

  for (const c of cards) {
    await sharp(source)
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .toFile(path.join(outDir, c.name));
  }
  console.log('Saved 8 nav card graphics');

  // Teacher avatar at top header:
  // x: ~ 632, top: ~ 35, width: 44, height: 44
  await sharp(source)
    .extract({ left: 630, top: 36, width: 48, height: 48 })
    .toFile(path.join(outDir, 'teacher_avatar.png'));
  console.log('Saved teacher_avatar.png');

  // 5 Shining students avatars:
  // y: ~ 765, height: ~ 56
  // Student 1: x: ~ 250, Student 2: x: ~ 296, Student 3: x: ~ 348, Student 4: x: ~ 400, Student 5: x: ~ 452
  const students = [
    { name: 'student_minh.png', left: 248, top: 765, width: 50, height: 50 },
    { name: 'student_ngoc.png', left: 298, top: 765, width: 50, height: 50 },
    { name: 'student_huy.png', left: 348, top: 765, width: 50, height: 50 },
    { name: 'student_anh.png', left: 398, top: 765, width: 50, height: 50 },
    { name: 'student_qminh.png', left: 448, top: 765, width: 50, height: 50 },
  ];
  for (const s of students) {
    await sharp(source)
      .extract({ left: s.left, top: s.top, width: s.width, height: s.height })
      .toFile(path.join(outDir, s.name));
  }
  console.log('Saved 5 shining student avatars');
}

extractMore().catch(console.error);
