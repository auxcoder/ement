/**
 * Tests for core/scheduler.js
 * Run with: node --test src/core/scheduler.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleUpdate, flushUpdates, pendingCount } from './scheduler.js';

describe('scheduleUpdate()', () => {
  it('runs the function asynchronously (microtask)', async () => {
    let ran = false;
    scheduleUpdate(() => { ran = true; });

    // Synchronously, it hasn't run yet
    assert.equal(ran, false);

    // After microtask resolves, it has run
    await Promise.resolve();
    assert.equal(ran, true);
  });

  it('deduplicates — same function runs only once per batch', async () => {
    let count = 0;
    const increment = () => { count++; };

    scheduleUpdate(increment);
    scheduleUpdate(increment);
    scheduleUpdate(increment);

    await Promise.resolve();
    assert.equal(count, 1);
  });

  it('runs different functions each once', async () => {
    let a = 0;
    let b = 0;
    const incA = () => { a++; };
    const incB = () => { b++; };

    scheduleUpdate(incA);
    scheduleUpdate(incB);
    scheduleUpdate(incA); // duplicate

    await Promise.resolve();
    assert.equal(a, 1);
    assert.equal(b, 1);
  });

  it('batches: 10 property changes → 1 update cycle', async () => {
    let renderCount = 0;
    const render = () => { renderCount++; };

    // Simulate 10 property changes all scheduling the same render
    for (let i = 0; i < 10; i++) {
      scheduleUpdate(render);
    }

    await Promise.resolve();
    assert.equal(renderCount, 1);
  });

  it('updates happen before next frame (microtask, not setTimeout)', async () => {
    const order = [];

    setTimeout(() => order.push('timeout'), 0);
    scheduleUpdate(() => order.push('microtask'));

    // Wait for both microtask and timeout
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(order[0], 'microtask');
    assert.equal(order[1], 'timeout');
  });

  it('allows new updates scheduled during flush (next batch)', async () => {
    const order = [];

    scheduleUpdate(() => {
      order.push('first');
      // Schedule during flush — should go in next batch
      scheduleUpdate(() => { order.push('second'); });
    });

    await Promise.resolve();
    assert.deepEqual(order, ['first']);

    // Second batch runs in next microtask
    await Promise.resolve();
    assert.deepEqual(order, ['first', 'second']);
  });
});

describe('flushUpdates()', () => {
  it('runs pending updates synchronously', () => {
    let ran = false;
    scheduleUpdate(() => { ran = true; });

    assert.equal(ran, false);
    flushUpdates();
    assert.equal(ran, true);
  });

  it('clears the queue after flush', () => {
    scheduleUpdate(() => {});
    scheduleUpdate(() => {});
    assert.equal(pendingCount(), 2);

    flushUpdates();
    assert.equal(pendingCount(), 0);
  });
});

describe('pendingCount()', () => {
  it('returns 0 when nothing is scheduled', async () => {
    // Ensure any prior tests have flushed
    await Promise.resolve();
    assert.equal(pendingCount(), 0);
  });

  it('reflects queued updates', () => {
    const a = () => {};
    const b = () => {};

    scheduleUpdate(a);
    assert.equal(pendingCount(), 1);

    scheduleUpdate(b);
    assert.equal(pendingCount(), 2);

    // Duplicate doesn't increase count
    scheduleUpdate(a);
    assert.equal(pendingCount(), 2);

    flushUpdates();
    assert.equal(pendingCount(), 0);
  });
});
