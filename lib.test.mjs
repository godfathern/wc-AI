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

import { matchDisplay, todaysMatches, placeKnockout } from './lib.mjs';

test('matchDisplay describes live, finished, and upcoming matches', () => {
  const live = matchDisplay(
    { status: 'IN_PLAY', minute: 67, score: { home: 2, away: 1 } },
    'America/New_York',
  );
  assert.deepEqual(live, { state: 'live', score: '2–1', minute: "67'", badge: 'TRỰC TIẾP' });

  const done = matchDisplay(
    { status: 'FINISHED', score: { home: 0, away: 0 } },
    'America/New_York',
  );
  assert.deepEqual(done, { state: 'finished', score: '0–0', minute: null, badge: 'KẾT THÚC' });

  const soon = matchDisplay(
    { status: 'TIMED', utcDate: '2026-06-23T19:00:00Z', score: { home: null, away: null } },
    'America/New_York',
  );
  assert.deepEqual(soon, { state: 'upcoming', score: null, minute: null, time: '15:00', badge: null });
});

test('todaysMatches filters to today and sorts by kickoff', () => {
  const now = Date.parse('2026-06-23T20:00:00Z');
  const tz = 'America/New_York';
  const matches = [
    { id: 1, utcDate: '2026-06-23T23:00:00Z' },
    { id: 2, utcDate: '2026-06-23T21:00:00Z' },
    { id: 3, utcDate: '2026-06-25T19:00:00Z' },
  ];
  assert.deepEqual(todaysMatches(matches, now, tz).map(m => m.id), [2, 1]);
});

test('placeKnockout buckets knockout matches by stage and ignores group games', () => {
  const matches = [
    { id: 1, stage: 'FINAL', utcDate: '2026-07-19T19:00:00Z' },
    { id: 2, stage: 'GROUP_STAGE', utcDate: '2026-06-23T19:00:00Z' },
    { id: 3, stage: 'LAST_16', utcDate: '2026-07-05T19:00:00Z' },
    { id: 4, stage: 'LAST_16', utcDate: '2026-07-04T19:00:00Z' },
  ];
  const out = placeKnockout(matches);
  assert.equal(out.GROUP_STAGE, undefined);
  assert.deepEqual(out.LAST_16.map(m => m.id), [4, 3]);
  assert.equal(out.FINAL[0].id, 1);
  assert.deepEqual(out.QUARTER_FINALS, []);
});
