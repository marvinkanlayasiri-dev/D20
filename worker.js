// worker.js

// How many rolls this worker generates per batch.
// Higher = faster but more heat; lower = smoother updates.
const BATCH_SIZE = 900000;

let running = false;
let localTotal = 0;
let localBestStreak = 0;
let localCurrentStreak = 0;

const TARGET_STREAK = 10;

function d20() {
  return (Math.random() * 20) | 0; // 0–19
}

function runBatch() {
  if (!running) return;

  let n = BATCH_SIZE;
  while (n--) {
    const roll = d20();

    if (roll === 19) {
      localCurrentStreak++;
    } else {
      // Send completed streak to main (but capped at 10 for display)
      if (localCurrentStreak > 0) {
        postMessage({
          type: "streak",
          value: Math.min(localCurrentStreak, 10)
        });
      }
      localCurrentStreak = 0;
    }

    localTotal++;
    if (localCurrentStreak > localBestStreak) {
      localBestStreak = localCurrentStreak;
    }

    if (localCurrentStreak >= TARGET_STREAK) {
      // Notify main we hit target
      postMessage({
        type: "hit",
        totalDelta: localTotal,
        bestStreak: localBestStreak
      });
      running = false;
      return;
    }
  }

  // Send progress update
  postMessage({
    type: "progress",
    totalDelta: localTotal,
    bestStreak: localBestStreak,
    currentStreak: localCurrentStreak
  });

  localTotal = 0;

  // Yield to browser
  setTimeout(runBatch, 0);
}

onmessage = (e) => {
  if (e.data.type === "start") {
    if (running) return;

    running = true;
    localTotal = 0;
    localBestStreak = 0;
    localCurrentStreak = 0;
    runBatch();
  }

  if (e.data.type === "stop") {
    running = false;
  }
};
