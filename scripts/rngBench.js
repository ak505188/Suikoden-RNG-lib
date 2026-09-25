import RNG from '../lib/rng.js';

const N = 10000000;
const RUNS = 7;

function bench(label, fn) {
  let sink = 0;
  for (let i = 0; i < 3; i++) sink ^= fn(N / 10); // warm-up

  const times = [];
  for (let r = 0; r < RUNS; r++) {
    const t0 = performance.now();
    sink ^= fn(N);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[RUNS >> 1];
  console.log(`${label.padEnd(20)} ${median.toFixed(1)} ms  ${(median * 1e6 / N).toFixed(2)} ns/op  (sink ${sink})`);
}

bench('next() x1', n => {
  const rng = new RNG(0x12);
  let acc = 0;
  for (let i = 0; i < n; i++) acc ^= rng.next().getRNG2();
  return acc;
});

bench('next(n) batched', n => new RNG(0x12).next(n).getRNG2());
