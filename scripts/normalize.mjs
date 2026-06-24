function team(t) {
  return {
    name: t?.name ?? 'TBD',
    code: t?.tla ?? '',
    crest: t?.crest ?? '',
  };
}

// football-data.org labels groups inconsistently across endpoints:
// /matches uses "GROUP_A", /standings uses "Group A". Normalize both to "A".
function groupKey(raw) {
  if (!raw) return null;
  return String(raw).replace(/^group[\s_]+/i, '').trim();
}

export function normalize(matchesResp, standingsResp) {
  const matches = (matchesResp.matches || []).map((m) => ({
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    stage: m.stage,
    group: groupKey(m.group),
    matchday: m.matchday ?? null,
    minute: m.minute ?? null,
    home: team(m.homeTeam),
    away: team(m.awayTeam),
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
    },
  }));

  const standings = (standingsResp.standings || [])
    .filter((s) => s.type === 'TOTAL')
    .map((s) => ({
      group: groupKey(s.group),
      table: (s.table || []).map((r) => ({
        team: r.team?.name ?? '',
        code: r.team?.tla ?? '',
        crest: r.team?.crest ?? '',
        played: r.playedGames ?? 0,
        won: r.won ?? 0,
        draw: r.draw ?? 0,
        lost: r.lost ?? 0,
        gf: r.goalsFor ?? 0,
        ga: r.goalsAgainst ?? 0,
        gd: r.goalDifference ?? 0,
        points: r.points ?? 0,
      })),
    }));

  return { standings, matches };
}
