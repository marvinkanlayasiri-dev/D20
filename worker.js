// worker.js

// How many rolls this worker does per batch
const BATCH_SIZE = 800000;  // 0.8M per batch – tune up/down

let running = false;
let localTotal = 0;
let localBestStreak = 0;
let localCurrentStreak = 0;

const TARGET_STREAK = 10;

function d20() {
  // 0–19, treat 19 as rolling a 20
  return (Math.random() * 20) | 0;
}

function runBatch() {
  if (!running) return;

  let n = BATCH_SIZE;
  while (n--) {
    const roll = d20();
    if (roll === 19) {
      localCurrentStreak++;
    } else {
      localCurrentStreak = 0;
    }

    localTotal++;
    if (localCurrentStreak > localBestStreak) {
      localBestStreak = localCurrentStreak;
    }

    if (localCurrentStreak >= TARGET_STREAK) {
      // Tell main thread we hit target
      postMessage({
        type: "hit",
        totalDelta: localTotal,
        bestStreak: localBestStreak
      });
      running = false;
      return;
    }
  }

  // Send progress to main thread
  postMessage({
    type: "progress",
    totalDelta: localTotal,
    bestStreak: localBestStreak,
    currentStreak: localCurrentStreak
  });

  // Reset localTotal so deltas don't explode
  localTotal = 0;

  // Yield a bit so browser doesn't kill the worker
  setTimeout(runBatch, 0);
}

onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "start") {
    if (running) return;
    running = true;
    localTotal = 0;
    localBestStreak = 0;
    localCurrentStreak = 0;
    runBatch();
  } else if (msg.type === "stop") {
    running = false;
  }
};
