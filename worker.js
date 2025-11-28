// worker.js
// DO NOT MODIFY INNER LOOP — SAFARI TURBO MODE DEPENDS ON IT.

const BATCH_SIZE = 1000000; // whatever your old fast version used
let running = false;
let localTotal = 0;
let localBest = 0;
let currentStreak = 0;
const TARGET = 10;

function roll() {
  return (Math.random() * 20) | 0;
}

function runLoop() {
  if (!running) return;

  const OUTER = 5; // matches your fast version behavior

  for (let j = 0; j < OUTER && running; j++) {
    let n = BATCH_SIZE;
    while (n--) {
      const r = roll();

      if (r === 19) {
        currentStreak++;
        if (currentStreak > localBest) {
          localBest = currentStreak;
        }
        if (currentStreak >= TARGET) {
          running = false;
          postMessage({
            type: "hit10",
            rolls: localTotal,
            best: localBest
          });
          return;
        }
      } else {
        if (currentStreak > 0) {
          // report a finished streak once per streak
          postMessage({
            type: "streak",
            value: currentStreak
          });
        }
        currentStreak = 0;
      }

      localTotal++;
    }
  }

  postMessage({
    type: "progress",
    rolls: localTotal,
    best: localBest
  });
  localTotal = 0;

  setTimeout(runLoop, 0);
}

onmessage = (e) => {
  if (e.data === "start") {
    running = true;
    localTotal = 0;
    localBest = 0;
    currentStreak = 0;
    runLoop();
  }
  if (e.data === "stop") running = false;
};
