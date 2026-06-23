// Dev-only: writes a demo data/worldcup.json with a live + upcoming match dated "today"
// so the UI's glow/Today-panel can be verified locally. Real data comes from the Action.
import { writeFileSync } from 'node:fs';

const now = Date.now();
const startedAgo = new Date(now - 60 * 60 * 1000).toISOString(); // kicked off 1h ago
const soon = new Date(now + 90 * 60 * 1000).toISOString();       // 90 min from now

const data = {
  updatedAt: new Date(now).toISOString(),
  standings: [
    {
      group: 'B',
      table: [
        { team: 'Argentina', code: 'ARG', crest: '', played: 2, won: 2, draw: 0, lost: 0, gf: 5, ga: 1, gd: 4, points: 6 },
        { team: 'Nigeria', code: 'NGA', crest: '', played: 2, won: 1, draw: 0, lost: 1, gf: 3, ga: 3, gd: 0, points: 3 },
        { team: 'Croatia', code: 'CRO', crest: '', played: 2, won: 1, draw: 0, lost: 1, gf: 2, ga: 2, gd: 0, points: 3 },
        { team: 'Canada', code: 'CAN', crest: '', played: 2, won: 0, draw: 0, lost: 2, gf: 1, ga: 5, gd: -4, points: 0 },
      ],
    },
  ],
  matches: [
    { id: 1, utcDate: startedAgo, status: 'IN_PLAY', minute: 55, stage: 'GROUP_STAGE', group: 'B',
      home: { name: 'Argentina', code: 'ARG', crest: '' }, away: { name: 'Nigeria', code: 'NGA', crest: '' },
      score: { home: 2, away: 1 } },
    { id: 2, utcDate: soon, status: 'TIMED', stage: 'GROUP_STAGE', group: 'C',
      home: { name: 'Brazil', code: 'BRA', crest: '' }, away: { name: 'Germany', code: 'GER', crest: '' },
      score: { home: null, away: null } },
  ],
};

writeFileSync('data/worldcup.json', JSON.stringify(data, null, 2) + '\n');
console.log('Wrote demo data/worldcup.json');
