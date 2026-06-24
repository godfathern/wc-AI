// Dev-only: writes a demo data/worldcup.json exercising all three sections
// (group tables, matchday calendar, knockout bracket). Real data comes from the Action.
import { writeFileSync } from 'node:fs';

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const live = new Date(now - 60 * 60 * 1000).toISOString();
const finished = new Date(now - 3 * day).toISOString();
const md2 = new Date(now + 1 * day).toISOString();
const md3 = new Date(now + 5 * day).toISOString();
const koDate = new Date(now + 12 * day).toISOString();
const finalDate = new Date(now + 30 * day).toISOString();

const T = (name, code) => ({ name, code, crest: '' });

const data = {
  updatedAt: new Date(now).toISOString(),
  standings: [
    { group: 'A', table: [
      { team: 'Mexico', code: 'MEX', crest: '', played: 2, won: 2, draw: 0, lost: 0, gf: 4, ga: 0, gd: 4, points: 6 },
      { team: 'Korea Republic', code: 'KOR', crest: '', played: 2, won: 1, draw: 0, lost: 1, gf: 2, ga: 2, gd: 0, points: 3 },
      { team: 'Czechia', code: 'CZE', crest: '', played: 2, won: 0, draw: 1, lost: 1, gf: 1, ga: 2, gd: -1, points: 1 },
      { team: 'South Africa', code: 'RSA', crest: '', played: 2, won: 0, draw: 1, lost: 1, gf: 1, ga: 4, gd: -3, points: 1 },
    ] },
    { group: 'B', table: [
      { team: 'Argentina', code: 'ARG', crest: '', played: 2, won: 2, draw: 0, lost: 0, gf: 5, ga: 1, gd: 4, points: 6 },
      { team: 'Nigeria', code: 'NGA', crest: '', played: 2, won: 1, draw: 0, lost: 1, gf: 3, ga: 3, gd: 0, points: 3 },
      { team: 'Croatia', code: 'CRO', crest: '', played: 2, won: 1, draw: 0, lost: 1, gf: 2, ga: 2, gd: 0, points: 3 },
      { team: 'Canada', code: 'CAN', crest: '', played: 2, won: 0, draw: 0, lost: 2, gf: 1, ga: 5, gd: -4, points: 0 },
    ] },
  ],
  matches: [
    { id: 1, utcDate: live, status: 'IN_PLAY', minute: 55, stage: 'GROUP_STAGE', matchday: 1, group: 'B',
      home: T('Argentina', 'ARG'), away: T('Nigeria', 'NGA'), score: { home: 2, away: 1 } },
    { id: 2, utcDate: finished, status: 'FINISHED', stage: 'GROUP_STAGE', matchday: 1, group: 'A',
      home: T('Mexico', 'MEX'), away: T('South Africa', 'RSA'), score: { home: 2, away: 0 } },
    { id: 3, utcDate: md2, status: 'TIMED', stage: 'GROUP_STAGE', matchday: 2, group: 'A',
      home: T('Mexico', 'MEX'), away: T('Korea Republic', 'KOR'), score: { home: null, away: null } },
    { id: 4, utcDate: md3, status: 'TIMED', stage: 'GROUP_STAGE', matchday: 3, group: 'B',
      home: T('Argentina', 'ARG'), away: T('Croatia', 'CRO'), score: { home: null, away: null } },
    { id: 5, utcDate: koDate, status: 'TIMED', stage: 'LAST_32', matchday: 4, group: null,
      home: T(null, null), away: T(null, null), score: { home: null, away: null } },
    { id: 6, utcDate: finalDate, status: 'TIMED', stage: 'FINAL', matchday: 8, group: null,
      home: T(null, null), away: T(null, null), score: { home: null, away: null } },
  ],
};

writeFileSync('data/worldcup.json', JSON.stringify(data, null, 2) + '\n');
console.log('Wrote demo data/worldcup.json');
