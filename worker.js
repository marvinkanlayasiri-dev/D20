// worker.js
// Ultra-optimized worker for d20 streak rolling

// How many rolls per inner batch (tight loop)
const BATCH_SIZE = 900000; // try 900k–1.5M per worker

let running = false;
let localTotalSinceLast = 0;
let localBestStreak = 0;
let localCurrentStreak = 0;

const TARGET_STREAK = 10;

function d20() {
  // 0–19, we treat 19 as "20"
  return (Math.random() * 20) | 0;
}

function runLoop() {
  if (!running) return;

  // Do several batches before reporting → fewer messages = more speed
  const OUTER_BATCHES = 6; // 6 * 900k = 5.4M rolls per progress tick

  for (let b = 0; b < OUTER_BATCHES && running; b++) {
    let n = BATCH_SIZE;
    while (n--) {
      const roll = d20();

      if (roll === 19) {
        localCurrentStreak++;
        if (localCurrentStreak > localBestStreak) {
          localBestStreak = localCurrentStreak;
        }
        if (localCurrentStreak >= TARGET_STREAK) {
          // Tell main thread and stop completely
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
        localCurrentStreak = 0;
      }

      localTotalSinceLast++;
    }
  }

  // Send a single progress update for this chunk
  if (localTotalSinceLast > 0) {
    postMessage({
      type: "progress",
      totalDelta: localTotalSinceLast,
      bestStreak: localBestStreak
    });
    localTotalSinceLast = 0;
  }

  // Yield back to the browser a tiny bit to avoid being flagged as hung
  if (running) {
    setTimeout(runLoop, 0);
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
