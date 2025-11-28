// worker.js
// Turbo multi-core d20 roller with minimal extra messaging

const BATCH_SIZE = 1500000;   // you can tweak this
const OUTER_BATCHES = 6;     // inner loops before reporting

let running = false;
let localTotalSinceLast = 0;
let localBestStreak = 0;
let localCurrentStreak = 0;

const TARGET_STREAK = 10;

function d20() {
  // 0–19, treat 19 as rolling a 20
  return (Math.random() * 20) | 0;
}

function runLoop() {
  if (!running) return;

  for (let b = 0; b < OUTER_BATCHES && running; b++) {
    let n = BATCH_SIZE;
    while (n--) {
      const roll = d20();

      if (roll === 19) {
        // extend current streak
        localCurrentStreak++;
        if (localCurrentStreak > localBestStreak) {
          localBestStreak = localCurrentStreak;
        }
        if (localCurrentStreak >= TARGET_STREAK) {
          // reached target streak: notify main & stop
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
        // streak broke; report finished streak (if any)
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

  // report progress for this chunk
  if (localTotalSinceLast > 0) {
    postMessage({
      type: "progress",
      totalDelta: localTotalSinceLast,
      bestStreak: localBestStreak
    });
    localTotalSinceLast = 0;
  }

  if (running) {
    // tiny yield so browser stays responsive
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
