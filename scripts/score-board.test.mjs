import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreCreatorBoard } from './score-board.mjs';

function makeItem(overrides = {}) {
  return {
    id: 'creator-compass-lite_eval_1',
    title: 'Founder build-in-public series',
    note: 'A concrete creator project note',
    category: 'Series',
    state: 'Active',
    score: 8,
    effort: 3,
    metric: 7,
    textOne: 'AI founders',
    textTwo: 'Draft the first three posts',
    date: '2026-04-26',
    ...overrides,
  };
}

function makeBackup(items) {
  return {
    schema: 'creator-compass-lite/v3',
    boardTitle: 'Creator compass board',
    boardSubtitle: 'A local-first board.',
    items,
    ui: { search: '', category: 'all', status: 'all', selectedId: items[0]?.id || null },
  };
}

test('scores a focused creator board without findings', () => {
  const result = scoreCreatorBoard(makeBackup([makeItem()]), { today: '2026-04-24' });

  assert.equal(result.ok, true);
  assert.equal(result.score, 100);
  assert.equal(result.findingCount, 0);
  assert.equal(result.activeCount, 1);
});

test('flags overdue and low momentum creator projects', () => {
  const result = scoreCreatorBoard(
    makeBackup([
      makeItem({ id: 'creator-compass-lite_overdue', title: 'Overdue launch thread', date: '2026-04-20' }),
      makeItem({ id: 'creator-compass-lite_low_momentum', title: 'High upside series', score: 9, metric: 3 }),
    ]),
    { today: '2026-04-24' },
  );

  assert.equal(result.ok, true);
  assert.equal(result.score, 77);
  assert.equal(result.findingCount, 2);
  assert.deepEqual(
    result.findings.map((finding) => [finding.severity, finding.title]),
    [
      ['high', 'Overdue launch thread'],
      ['medium', 'High upside series'],
    ],
  );
});

test('ignores published projects when scoring active queue risk', () => {
  const result = scoreCreatorBoard(
    makeBackup([makeItem({ state: 'Published', date: '2026-04-01', metric: 2, effort: 10 })]),
    { today: '2026-04-24' },
  );

  assert.equal(result.ok, true);
  assert.equal(result.score, 100);
  assert.equal(result.activeCount, 0);
  assert.equal(result.findingCount, 0);
});

test('returns validation errors instead of scoring malformed backups', () => {
  const result = scoreCreatorBoard({ schema: 'creator-compass-lite/v3', items: [{ id: 'broken' }] }, { today: '2026-04-24' });

  assert.equal(result.ok, false);
  assert.equal(result.score, 0);
  assert.ok(result.errors.some((message) => message.includes('items[0].title')));
});
