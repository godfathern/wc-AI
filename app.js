import {
  GROUPS, KNOCKOUT_STAGES, STAGE_LABEL, groupLabel,
  sortStandings, matchDisplay, todaysMatches, placeKnockout,
} from './lib.mjs';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
let lastData = null;
let lastDateKey = null;

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

function render(data) {
  const now = Date.now();
  const matches = data.matches || [];
  const standingsByGroup = Object.fromEntries((data.standings || []).map((s) => [s.group, s.table]));
  const today = todaysMatches(matches, now, TZ);
  const todayIds = new Set(today.map((m) => m.id));

  renderGroups(standingsByGroup, matches, todayIds);
  renderToday(today);
  renderBracket(placeKnockout(matches), todayIds);
  renderLiveCount(matches);
  renderStatus(data.updatedAt);
  lastDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(now));
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function teamLabel(t) {
  return t.code || t.name || 'TBD';
}

function renderGroups(standingsByGroup, matches, todayIds) {
  const todayGroups = new Set(
    matches.filter((m) => todayIds.has(m.id) && m.group).map((m) => m.group),
  );
  const left = document.getElementById('groups-left');
  const right = document.getElementById('groups-right');
  left.innerHTML = '';
  right.innerHTML = '';

  GROUPS.forEach((g, i) => {
    const box = el('div', 'group-box' + (todayGroups.has(g) ? ' today' : ''));
    box.appendChild(el('div', 'group-head', groupLabel(g)));

    const table = sortStandings(standingsByGroup[g] || []);
    if (table.length === 0) {
      box.appendChild(el('div', 'row empty', '—'));
    } else {
      table.forEach((r) => {
        box.appendChild(
          el(
            'div',
            'row',
            `<img class="crest" src="${r.crest}" alt="" onerror="this.style.visibility='hidden'">` +
              `<span class="code">${r.code || r.team}</span>` +
              `<span class="p">${r.played}</span>` +
              `<span class="pts">${r.points}</span>`,
          ),
        );
      });
    }
    (i < 6 ? left : right).appendChild(box);
  });
}

function renderToday(today) {
  const list = document.getElementById('today-list');
  list.innerHTML = '';
  if (today.length === 0) {
    list.appendChild(el('div', 'today-empty', 'Không có trận đấu hôm nay'));
    return;
  }
  today.forEach((m) => {
    const d = matchDisplay(m, TZ);
    let right;
    if (d.state === 'upcoming') {
      right = `<span class="t-time">${d.time}</span>`;
    } else {
      const minute = d.minute ? `<span class="t-min">${d.minute}</span>`
        : d.state === 'live' ? '<span class="t-min">LIVE</span>' : '';
      right = `<span class="t-score">${d.score}</span>${minute}`;
    }
    list.appendChild(
      el('div', 'today-match ' + d.state,
        `<span class="t-teams">${teamLabel(m.home)} v ${teamLabel(m.away)}</span>${right}`),
    );
  });
}

function renderBracket(byStage, todayIds) {
  const wrap = document.getElementById('bracket');
  wrap.innerHTML = '';
  KNOCKOUT_STAGES.forEach((stage) => {
    const isFinal = stage === 'FINAL';
    const col = el('div', 'bracket-col' + (isFinal ? ' final' : ''));
    col.appendChild(el('div', 'bracket-label', STAGE_LABEL[stage]));
    if (isFinal) col.appendChild(el('div', 'slot trophy', '🏆'));

    const ms = byStage[stage] || [];
    if (ms.length === 0) {
      col.appendChild(el('div', 'slot tbd', '—'));
    } else {
      ms.forEach((m) => {
        const d = matchDisplay(m, TZ);
        const mid = d.state === 'upcoming' ? d.time : d.score;
        col.appendChild(
          el('div', 'slot ' + d.state + (todayIds.has(m.id) ? ' today' : ''),
            `<span>${teamLabel(m.home)}</span><b>${mid}</b><span>${teamLabel(m.away)}</span>`),
        );
      });
    }
    wrap.appendChild(col);
  });
}

function renderLiveCount(matches) {
  const live = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;
  const badge = document.getElementById('livecount');
  document.getElementById('livenum').textContent = String(live);
  badge.hidden = live === 0;
}

function renderStatus(updatedAt) {
  const upd = document.getElementById('updated');
  if (!updatedAt) {
    upd.textContent = 'Chưa có dữ liệu';
    return;
  }
  const t = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(updatedAt));
  upd.textContent = 'Cập nhật ' + t;
}

function tick() {
  document.getElementById('datetime').textContent = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
}

function maybeRollover() {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  if (key !== lastDateKey && lastData) render(lastData);
}

document.getElementById('tzlabel').textContent = 'Giờ địa phương: ' + TZ;
tick();
load();
setInterval(tick, 1000);
setInterval(load, 60000);
setInterval(maybeRollover, 60000);
