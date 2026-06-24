import {
  GROUPS, STAGE_LABEL, MATCHDAY_LABEL, groupLabel,
  sortStandings, matchDisplay, toLocalDateTime, groupStageByMatchday, placeKnockout,
} from './lib.mjs';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
let lastData = null;

// Placeholder player portraits shown in the centre of the bracket (like the poster).
// Replace the files in assets/players/ — or point these paths at your own images.
const PLAYER_PHOTOS = [
  'assets/players/player1.svg',
  'assets/players/player2.svg',
  'assets/players/player3.svg',
  'assets/players/player4.svg',
  'assets/players/player5.svg',
  'assets/players/player6.svg',
];

async function load() {
  try {
    const res = await fetch('data/worldcup.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    lastData = await res.json();
    render(lastData);
  } catch (err) {
    console.error('fetch failed, keeping last render', err);
  }
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function teamLabel(t) {
  return (t && (t.code || t.name)) || 'TBD';
}

function crestImg(t) {
  const url = t && t.crest ? t.crest : '';
  return `<img class="crest" src="${url}" alt="" onerror="this.style.visibility='hidden'">`;
}

function render(data) {
  const matches = data.matches || [];
  const standingsByGroup = Object.fromEntries((data.standings || []).map((s) => [s.group, s.table]));
  renderGroups(standingsByGroup);
  renderCalendar(groupStageByMatchday(matches));
  renderBracket(placeKnockout(matches));
  renderLiveCount(matches);
  renderStatus(data.updatedAt);
}

/* ---- Band 1: group standings ---- */
function renderGroups(standingsByGroup) {
  const wrap = document.getElementById('groups');
  wrap.innerHTML = '';
  GROUPS.forEach((g) => {
    const box = el('div', 'group-box');
    box.appendChild(el('div', 'group-head', groupLabel(g)));
    box.appendChild(el('div', 'standings-row head',
      '<span></span><span class="team">Đội</span><span class="p">Trận</span><span class="pts">Điểm</span>'));
    const table = sortStandings(standingsByGroup[g] || []);
    if (table.length === 0) {
      box.appendChild(el('div', 'standings-row empty', '—'));
    } else {
      table.forEach((r, i) => {
        box.appendChild(el('div', 'standings-row' + (i === 0 ? ' r1' : ''),
          `${crestImg(r)}<span class="team">${r.code || r.team}</span>`
          + `<span class="p">${r.played}</span><span class="pts">${r.points}</span>`));
      });
    }
    wrap.appendChild(box);
  });
}

/* ---- Band 2: matchday calendar ---- */
function matchRow(m) {
  const d = matchDisplay(m, TZ);
  let mid;
  if (d.state === 'upcoming') mid = `<span class="mid time">${toLocalDateTime(m.utcDate, TZ)}</span>`;
  else if (d.state === 'live') mid = `<span class="mid live">${d.score}</span>`;
  else mid = `<span class="mid">${d.score}</span>`;
  return el('div', 'match-row' + (d.state === 'live' ? ' live' : ''),
    `<span class="side home"><span class="code">${teamLabel(m.home)}</span>${crestImg(m.home)}</span>`
    + mid
    + `<span class="side away">${crestImg(m.away)}<span class="code">${teamLabel(m.away)}</span></span>`);
}

function renderCalendar(byMatchday) {
  const wrap = document.getElementById('calendar');
  wrap.innerHTML = '';
  [1, 2, 3].forEach((md) => {
    const col = el('div', 'md-col md' + md);
    col.appendChild(el('div', 'md-head', MATCHDAY_LABEL[md]));
    const ms = byMatchday[md] || [];
    if (ms.length === 0) {
      col.appendChild(el('div', 'match-row', '<span></span><span class="mid time">—</span><span></span>'));
    } else {
      ms.forEach((m) => col.appendChild(matchRow(m)));
    }
    wrap.appendChild(col);
  });
}

/* ---- Band 3: knockout bracket (mirrored) ---- */
function koSlot(m) {
  const d = matchDisplay(m, TZ);
  const showScore = d.state !== 'upcoming';
  const hs = showScore ? `<span class="sc">${m.score?.home ?? ''}</span>` : '';
  const as = showScore ? `<span class="sc">${m.score?.away ?? ''}</span>` : '';
  const isTBD = teamLabel(m.home) === 'TBD' && teamLabel(m.away) === 'TBD';
  const slot = el('div', 'ko-slot' + (d.state === 'live' ? ' live' : '') + (isTBD ? ' tbd' : ''));
  slot.appendChild(el('div', 'ko-date', toLocalDateTime(m.utcDate, TZ)));
  slot.appendChild(el('div', 'ko-line', `${crestImg(m.home)}<span class="code">${teamLabel(m.home)}</span>${hs}`));
  slot.appendChild(el('div', 'ko-line', `${crestImg(m.away)}<span class="code">${teamLabel(m.away)}</span>${as}`));
  return slot;
}

function bracketColumn(label, cls, matches) {
  const col = el('div', 'bracket-col');
  col.appendChild(el('div', 'round-head ' + cls, label));
  const slots = el('div', 'col-slots');
  (matches || []).forEach((m) => slots.appendChild(koSlot(m)));
  col.appendChild(slots);
  return col;
}

// Staggered arc: centre cards raised + larger, flanks lower/smaller, outers
// tilted outward and overlapping — a "formation" rather than a flat equal row.
const FORMATION = [
  { dy: 24, sc: 0.82, rot: -8, z: 1 },
  { dy: 6, sc: 0.94, rot: -4, z: 2 },
  { dy: -14, sc: 1.14, rot: -2, z: 4 },
  { dy: -14, sc: 1.14, rot: 2, z: 4 },
  { dy: 6, sc: 0.94, rot: 4, z: 2 },
  { dy: 24, sc: 0.82, rot: 8, z: 1 },
];

function playersStrip() {
  const strip = el('div', 'players-strip');
  PLAYER_PHOTOS.forEach((src, i) => {
    const f = FORMATION[i] || { dy: 0, sc: 1, rot: 0, z: 1 };
    const img = document.createElement('img');
    img.className = 'player-card';
    img.src = src;
    img.alt = 'Cầu thủ ' + (i + 1);
    img.style.transform = `translateY(${f.dy}px) scale(${f.sc}) rotate(${f.rot}deg)`;
    img.style.zIndex = String(f.z);
    img.onerror = function () { this.style.visibility = 'hidden'; };
    strip.appendChild(img);
  });
  return strip;
}

function half(arr) {
  const list = arr || [];
  const mid = Math.ceil(list.length / 2);
  return [list.slice(0, mid), list.slice(mid)];
}

function renderBracket(byStage) {
  const wrap = document.getElementById('bracket');
  wrap.innerHTML = '';

  const [r16L, r16R] = half(byStage.LAST_32);
  const [r8L, r8R] = half(byStage.LAST_16);
  const [qfL, qfR] = half(byStage.QUARTER_FINALS);
  const [sfL, sfR] = half(byStage.SEMI_FINALS);

  // Left half
  wrap.appendChild(bracketColumn(STAGE_LABEL.LAST_32, 'r16', r16L));
  wrap.appendChild(bracketColumn(STAGE_LABEL.LAST_16, 'r8', r8L));
  wrap.appendChild(bracketColumn(STAGE_LABEL.QUARTER_FINALS, 'qf', qfL));
  wrap.appendChild(bracketColumn(STAGE_LABEL.SEMI_FINALS, 'sf', sfL));

  // Center: players strip (poster hero) + final + trophy + third place
  const center = el('div', 'bracket-col center');
  center.appendChild(playersStrip());
  center.appendChild(el('div', 'round-head final', STAGE_LABEL.FINAL));
  (byStage.FINAL || []).forEach((m) => center.appendChild(koSlot(m)));
  center.appendChild(el('div', 'trophy-centerpiece', '<div class="cup">🏆</div><div class="cap">VÔ ĐỊCH 2026</div>'));
  center.appendChild(el('div', 'round-head third', STAGE_LABEL.THIRD_PLACE));
  (byStage.THIRD_PLACE || []).forEach((m) => center.appendChild(koSlot(m)));
  wrap.appendChild(center);

  // Right half (mirrored)
  wrap.appendChild(bracketColumn(STAGE_LABEL.SEMI_FINALS, 'sf', sfR));
  wrap.appendChild(bracketColumn(STAGE_LABEL.QUARTER_FINALS, 'qf', qfR));
  wrap.appendChild(bracketColumn(STAGE_LABEL.LAST_16, 'r8', r8R));
  wrap.appendChild(bracketColumn(STAGE_LABEL.LAST_32, 'r16', r16R));
}

/* ---- Header / footer ---- */
function renderLiveCount(matches) {
  const live = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;
  document.getElementById('livenum').textContent = String(live);
  document.getElementById('livecount').hidden = live === 0;
}

function renderStatus(updatedAt) {
  const upd = document.getElementById('updated');
  if (!updatedAt) { upd.textContent = 'Chưa có dữ liệu'; return; }
  const t = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(updatedAt));
  upd.textContent = 'Cập nhật ' + t;
}

function tick() {
  document.getElementById('datetime').textContent = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());
}

document.getElementById('tzlabel').textContent = 'Giờ địa phương: ' + TZ;
tick();
load();
setInterval(tick, 1000);
setInterval(load, 60000);
