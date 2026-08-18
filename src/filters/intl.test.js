/**
 * Tests for filters/intl.js
 * Run with: node --test src/filters/intl.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatNumber, formatPercent, formatDate, formatRelative, formatList, formatPlural } from './intl.js';

describe('formatCurrency()', () => {
  it('formats USD by default', () => {
    const result = formatCurrency(1234.56);
    assert.ok(result.includes('1,234.56') || result.includes('1234.56'));
    assert.ok(result.includes('$'));
  });

  it('formats other currencies', () => {
    const result = formatCurrency(99.99, 'EUR', 'de-DE');
    assert.ok(result.includes('99,99') || result.includes('99.99'));
    assert.ok(result.includes('€'));
  });
});

describe('formatNumber()', () => {
  it('formats with locale separators', () => {
    const result = formatNumber(1234567.89, {}, 'en-US');
    assert.ok(result.includes('1,234,567.89'));
  });

  it('supports options (min/max fraction digits)', () => {
    const result = formatNumber(3.1, { minimumFractionDigits: 2 }, 'en-US');
    assert.equal(result, '3.10');
  });
});

describe('formatPercent()', () => {
  it('formats as percentage', () => {
    const result = formatPercent(0.75, 'en-US');
    assert.ok(result.includes('75'));
    assert.ok(result.includes('%'));
  });
});

describe('formatDate()', () => {
  it('formats with medium style by default', () => {
    const result = formatDate('2026-08-18T12:00:00', 'medium', 'en-US');
    assert.ok(result.includes('Aug'));
    assert.ok(result.includes('2026'));
  });

  it('formats with short style', () => {
    const result = formatDate('2026-08-18', 'short', 'en-US');
    assert.ok(result.includes('8') || result.includes('18'));
  });

  it('formats with long style', () => {
    const result = formatDate('2026-08-18', 'long', 'en-US');
    assert.ok(result.includes('August'));
  });
});

describe('formatRelative()', () => {
  it('formats recent date as relative time', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelative(fiveMinutesAgo, 'en-US');
    assert.ok(result.includes('5') && result.includes('minute'));
  });

  it('formats days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = formatRelative(threeDaysAgo, 'en-US');
    assert.ok(result.includes('3') && result.includes('day'));
  });
});

describe('formatList()', () => {
  it('formats with conjunction (and)', () => {
    const result = formatList(['Apple', 'Banana', 'Cherry'], 'conjunction', 'en-US');
    assert.ok(result.includes('Apple'));
    assert.ok(result.includes('and'));
    assert.ok(result.includes('Cherry'));
  });

  it('formats with disjunction (or)', () => {
    const result = formatList(['Red', 'Blue', 'Green'], 'disjunction', 'en-US');
    assert.ok(result.includes('or'));
  });

  it('formats in Spanish', () => {
    const result = formatList(['A', 'B', 'C'], 'conjunction', 'es-ES');
    assert.ok(result.includes('y'));
  });
});

describe('formatPlural()', () => {
  it('selects "one" form for 1', () => {
    const result = formatPlural(1, { one: '# item', other: '# items' }, 'en-US');
    assert.equal(result, '1 item');
  });

  it('selects "other" form for > 1', () => {
    const result = formatPlural(5, { one: '# item', other: '# items' }, 'en-US');
    assert.equal(result, '5 items');
  });

  it('selects "other" form for 0', () => {
    const result = formatPlural(0, { one: '# item', other: '# items' }, 'en-US');
    assert.equal(result, '0 items');
  });
});
