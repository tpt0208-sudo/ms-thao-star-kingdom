import confetti from 'canvas-confetti';
import { audioManager } from './audioManager';

// Play sound integrated with centralized audioManager settings
export function playStarSound(type: 'star' | 'deduct' | 'levelUp' | 'spin' | 'win' | 'click') {
  if (type === 'click') {
    audioManager.playClick();
  } else if (type === 'star') {
    audioManager.playStarReward();
  } else if (type === 'win' || type === 'levelUp') {
    audioManager.playCelebration();
  } else if (type === 'spin') {
    audioManager.playToolSound('spin');
  } else if (type === 'deduct') {
    audioManager.playToolSound('tick');
  }
}

// Trigger golden stars confetti
export function triggerStarConfetti(originX = 0.5, originY = 0.5) {
  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { x: originX, y: originY },
      colors: ['#FFD700', '#FFA500', '#FF4500', '#38BDF8', '#4ADE80'],
      shapes: ['star', 'circle'],
      scalar: 1.2,
      ticks: 200,
    });
  } catch (e) {
    console.debug('Confetti error:', e);
  }
}

let activeCelebrationFrame: number | null = null;
let celebrationTimeout: NodeJS.Timeout | null = null;

export function stopCelebration() {
  if (activeCelebrationFrame) {
    cancelAnimationFrame(activeCelebrationFrame);
    activeCelebrationFrame = null;
  }
  if (celebrationTimeout) {
    clearTimeout(celebrationTimeout);
    celebrationTimeout = null;
  }
  audioManager.stopAll();
}

export function triggerGrandCelebration() {
  try {
    stopCelebration();
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#FFD700', '#F43F5E', '#3B82F6', '#10B981', '#A855F7', '#FB923C'];

    function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors,
      });

      if (Date.now() < end) {
        activeCelebrationFrame = requestAnimationFrame(frame);
      } else {
        activeCelebrationFrame = null;
      }
    }
    frame();
  } catch (e) {
    console.debug('Confetti error:', e);
  }
}
