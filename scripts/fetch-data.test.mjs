import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeIfChanged } from './fetch-data.mjs';

test('writeIfChanged writes first time, ignores updatedAt-only changes, writes real changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wc-'));
  const p = join(dir, 'worldcup.json');
  try {
    const a = { updatedAt: '2026-06-23T10:00:00Z', standings: [], matches: [{ id: 1 }] };
    assert.equal(writeIfChanged(p, a), true);

    const b = { updatedAt: '2026-06-23T10:10:00Z', standings: [], matches: [{ id: 1 }] };
    assert.equal(writeIfChanged(p, b), false);

    const c = { updatedAt: '2026-06-23T10:20:00Z', standings: [], matches: [{ id: 2 }] };
    assert.equal(writeIfChanged(p, c), true);
    assert.match(readFileSync(p, 'utf8'), /"id": 2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
