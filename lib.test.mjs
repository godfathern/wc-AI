import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, KNOCKOUT_STAGES, STAGE_LABEL, groupLabel, sortStandings } from './lib.mjs';

test('GROUPS lists the 12 groups A..L', () => {
  assert.equal(GROUPS.length, 12);
  assert.equal(GROUPS[0], 'A');
  assert.equal(GROUPS[11], 'L');
});

test('groupLabel and STAGE_LABEL are Vietnamese', () => {
  assert.equal(groupLabel('A'), 'NHÓM A');
  assert.equal(STAGE_LABEL.FINAL, 'CHUNG KẾT');
  assert.equal(STAGE_LABEL.LAST_32, 'VÒNG 32');
  assert.deepEqual(KNOCKOUT_STAGES, [
    'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
  ]);
});

test('sortStandings orders by points, then GD, then GF', () => {
  const table = [
    { team: 'A', points: 3, gd: 1, gf: 2 },
    { team: 'B', points: 6, gd: 0, gf: 1 },
    { team: 'C', points: 6, gd: 2, gf: 3 },
  ];
  assert.deepEqual(sortStandings(table).map(r => r.team), ['C', 'B', 'A']);
});

import { toLocalTime, localDateKey, isToday } from './lib.mjs';

test('toLocalTime formats UTC into a 24h local time string', () => {
  assert.equal(toLocalTime('2026-06-23T23:00:00Z', 'America/New_York'), '19:00');
  assert.equal(toLocalTime('2026-06-23T19:00:00Z', 'America/New_York'), '15:00');
});

test('localDateKey returns YYYY-MM-DD in the given zone', () => {
  assert.equal(localDateKey('2026-06-24T01:00:00Z', 'America/New_York'), '2026-06-23');
  assert.equal(localDateKey('2026-06-24T05:00:00Z', 'America/New_York'), '2026-06-24');
});

test('isToday compares local calendar dates, not UTC', () => {
  const now = Date.parse('2026-06-23T20:00:00Z'); // 16:00 in New York on the 23rd
  const tz = 'America/New_York';
  assert.equal(isToday('2026-06-23T23:00:00Z', now, tz), true);
  assert.equal(isToday('2026-06-24T01:00:00Z', now, tz), true);
  assert.equal(isToday('2026-06-24T05:00:00Z', now, tz), false);
});
