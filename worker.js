// worker.js — Safari-safe turbo version

// Smaller batch size prevents per-loop CPU spikes
const BATCH_SIZE = 600000;    // was 1.5M — too large for Safari
const OUTER_BATCHES = 6;

let running = false;
let localTotalSinceLast = 0;
let localBestStreak = 0;
let localCurrentStreak = 0;

const TARGET_STREAK = 10;

// Super-fast d20 generator
function d20() {
  return (Math.random() * 20) | 0;
}

function runLoop() {
  if (!running) return;

  for (let b = 0; b < OUTER_BATCHES && running; b++) {
    let n = BATCH_SIZE;

    while (n--) {

      // --- SAFARI MICRO-YIELD PROTECTION ---
      // Every ~200k iterations, give Safari a tiny breathing gap
      if ((n & 0x2FFFF) === 0) {  
        if (!running) return;
      }
      // --------------------------------------

      const roll = d20();

      if (roll === 19) {
        localCurrentStreak++;
        if (localCurrentStreak > localBestStreak) {
          localBestStreak = localCurrentStreak;
        }

        if (localCurrentStreak >= TARGET_STREAK) {
          localTotalSinceLast++;
          running = false;
          postMessage({
            type: "hit",
            totalDelta: localTotalSinceLast,
            bestStreak: localBestStreak
          });
          return;
        }

      } else {
        if (localCurrentStreak > 0) {
          postMessage({
            type: "streak",
            value: localCurrentStreak
          });
        }
        localCurrentStreak = 0;
      }

      localTotalSinceLast++;
    }
  }

  // Report chunk of rolls
  if (localTotalSinceLast > 0) {
    postMessage({
      type: "progress",
      totalDelta: localTotalSinceLast,
      bestStreak: localBestStreak
    });
    localTotalSinceLast = 0;
  }

  if (running) {
    // SAFARI-FRIENDLY YIELD  
    // 1ms timeout prevents WebKit watchdog crash
    setTimeout(runLoop, 1);
  }
}

onmessage = (e) => {
  const msg = e.data;

  if (msg.type === "start") {
    if (running) return;

    running = true;
    localTotalSinceLast = 0;
    localBestStreak = 0;
    localCurrentStreak = 0;

    runLoop();

  } else if (msg.type === "stop") {
    running = false;
  }
};