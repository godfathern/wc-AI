export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const KNOCKOUT_STAGES = [
  'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
];

export const STAGE_LABEL = {
  GROUP_STAGE: 'VÒNG BẢNG',
  LAST_32: 'VÒNG 32',
  LAST_16: 'VÒNG 16',
  QUARTER_FINALS: 'VÒNG TỨ KẾT',
  SEMI_FINALS: 'VÒNG BÁN KẾT',
  THIRD_PLACE: 'TRANH HẠNG BA',
  FINAL: 'CHUNG KẾT',
};

export function groupLabel(letter) {
  return `NHÓM ${letter}`;
}

export function sortStandings(table) {
  return [...table].sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      String(a.team).localeCompare(String(b.team)),
  );
}

export function toLocalTime(utcISO, tz) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(utcISO));
}

export function localDateKey(utcISO, tz) {
  // en-CA renders as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcISO));
}

export function isToday(utcISO, nowMs, tz) {
  const nowISO = new Date(nowMs).toISOString();
  return localDateKey(utcISO, tz) === localDateKey(nowISO, tz);
}

export function matchDisplay(match, tz) {
  const status = match.status;
  if (status === 'IN_PLAY' || status === 'PAUSED') {
    return {
      state: 'live',
      score: `${match.score?.home ?? 0}–${match.score?.away ?? 0}`,
      minute: match.minute ? `${match.minute}'` : null,
      badge: 'TRỰC TIẾP',
    };
  }
  if (status === 'FINISHED') {
    return {
      state: 'finished',
      score: `${match.score?.home ?? 0}–${match.score?.away ?? 0}`,
      minute: null,
      badge: 'KẾT THÚC',
    };
  }
  return {
    state: 'upcoming',
    score: null,
    minute: null,
    time: match.utcDate ? toLocalTime(match.utcDate, tz) : '—',
    badge: null,
  };
}

export function todaysMatches(matches, nowMs, tz) {
  return matches
    .filter((m) => isToday(m.utcDate, nowMs, tz))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
}

export function placeKnockout(matches) {
  const out = {};
  for (const stage of KNOCKOUT_STAGES) out[stage] = [];
  for (const m of matches) {
    if (out[m.stage]) out[m.stage].push(m);
  }
  for (const stage of KNOCKOUT_STAGES) {
    out[stage].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  }
  return out;
}
