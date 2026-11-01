import assert from 'node:assert/strict';
import {
  quorumModel,
  queueModel,
  cacheBurstModel,
  poolModel,
  tokenBucketModel,
} from '../src/domain/simulation-models.mjs';
// Exhaustive fixed membership check: the computed lower bound must match actual subsets.
const subsets = (n, k) =>
  Array.from({ length: 1 << n }, (_, x) => x).filter(
    (x) => x.toString(2).replace(/0/g, '').length === k,
  );
for (const n of [3, 5])
  for (let r = 1; r <= n; r++)
    for (let w = 1; w <= n; w++) {
      const reads = subsets(n, r),
        writes = subsets(n, w),
        min = Math.min(
          ...reads.flatMap((a) => writes.map((b) => (a & b).toString(2).replace(/0/g, '').length)),
        );
      assert.equal(quorumModel(n, r, w, n).readWriteIntersection, min);
    }
assert.deepEqual([quorumModel(3, 2, 2, 1).read, quorumModel(3, 2, 2, 1).write], [false, false]);
assert.equal(quorumModel(3, 1, 1, 1).readWriteIntersection, 0);
assert.throws(() => quorumModel(3, 4, 2, 3), RangeError);
// Conservation and bounded admission, including a fully stalled consumer group.
for (const [arrival, workers, ms, cap, t] of [
  [3000, 8, 5, 10000, 20],
  [100, 0, 10, 500, 10],
  [100, 2, 20, 1000, 30],
  [10, 1, 5, 100, 20],
]) {
  const m = queueModel(arrival, workers, ms, cap, t);
  assert.equal(m.arrived, m.processed + m.queued + m.rejected);
  assert(m.queued <= cap && m.queued >= 0);
  assert(m.rejected >= 0);
}
const overloaded = queueModel(3000, 8, 5, 10000, 20);
assert.equal(overloaded.queued, 10000);
assert.equal(overloaded.rejected, 18000);
assert.equal(overloaded.drainSeconds, 6.25);
assert.equal(queueModel(100, 2, 20, 1000, 30).queued, 0);
assert.equal(queueModel(100, 0, 10, 500, 10).drainSeconds, Infinity);
assert.equal(cacheBurstModel(1000, 10, 'none').fetches, 1000);
assert.equal(cacheBurstModel(1000, 10, 'local').fetches, 10);
assert.equal(cacheBurstModel(5, 10, 'local').fetches, 5);
assert.equal(cacheBurstModel(1000, 10, 'coordinated').fetches, 1);
assert.equal(poolModel(800, 40, 40).offered, 32);
assert.equal(poolModel(1000, 40, 40).stable, false);
// Tokens cannot be minted beyond initial capacity plus elapsed refill.
for (const [rate, capacity, burst, steady] of [
  [100, 200, 600, 150],
  [0, 20, 100, 30],
  [20, 100, 0, 0],
]) {
  const rows = tokenBucketModel(rate, capacity, burst, steady);
  let accepted = 0;
  for (const row of rows) {
    accepted += row.accepted;
    assert(row.tokens >= 0 && row.tokens <= capacity);
    assert.equal(row.incoming, row.accepted + row.rejected);
    assert(accepted <= capacity + rate * row.t);
  }
}
console.log(
  'PASS: quorum intersection, admission conservation, cache coalescing, pool utilization and token budgets.',
);
