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
