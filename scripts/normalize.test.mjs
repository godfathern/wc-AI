import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize } from './normalize.mjs';

const matchesResp = JSON.parse(readFileSync(new URL('../test/fixtures/matches.sample.json', import.meta.url)));
const standingsResp = JSON.parse(readFileSync(new URL('../test/fixtures/standings.sample.json', import.meta.url)));

test('normalize maps a live group match', () => {
  const { matches } = normalize(matchesResp, standingsResp);
  assert.deepEqual(matches[0], {
    id: 1,
    utcDate: '2026-06-23T19:00:00Z',
    status: 'IN_PLAY',
    stage: 'GROUP_STAGE',
    group: 'B',
    minute: 67,
    home: { name: 'Argentina', code: 'ARG', crest: 'https://x/arg.png' },
    away: { name: 'Nigeria', code: 'NGA', crest: 'https://x/nga.png' },
    score: { home: 2, away: 1 },
  });
});

test('normalize handles a TBD knockout match (null team/score)', () => {
  const { matches } = normalize(matchesResp, standingsResp);
  assert.equal(matches[1].group, null);
  assert.equal(matches[1].home.name, 'TBD');
  assert.equal(matches[1].score.home, null);
  assert.equal(matches[1].stage, 'FINAL');
});

test('normalize keeps only TOTAL standings and strips GROUP_ prefix', () => {
  const { standings } = normalize(matchesResp, standingsResp);
  assert.equal(standings.length, 1);
  assert.equal(standings[0].group, 'B');
  assert.equal(standings[0].table[0].code, 'ARG');
  assert.equal(standings[0].table[0].points, 6);
  assert.equal(standings[0].table[0].gd, 4);
});
