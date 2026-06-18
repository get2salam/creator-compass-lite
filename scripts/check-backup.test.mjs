import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from './check-backup.mjs';

function makeItem(overrides = {}) {
  return {
    id: 'creator-compass-lite_abc12345',
    title: 'Founder build-in-public series',
    note: 'A real note',
    category: 'Series',
    state: 'Prioritised',
    score: 8,
    effort: 3,
    metric: 7,
    textOne: 'AI founders',
    textTwo: 'Draft the first three posts',
    date: '2026-04-26',
    ...overrides,
  };
}

function makeBackup(overrides = {}) {
  return {
    schema: 'creator-compass-lite/v3',
    boardTitle: 'Creator compass board',
    boardSubtitle: 'A local-first board.',
    items: [makeItem()],
    ui: { search: '', category: 'all', status: 'all', selectedId: null },
    ...overrides,
  };
}

test('accepts a well-formed v3 backup', () => {
  const result = validateBackup(makeBackup());
  assert.deepEqual(result, { ok: true, errors: [] });
});

test('rejects non-object roots', () => {
  for (const value of [null, 'string', 42, []]) {
    const result = validateBackup(value);
    assert.equal(result.ok, false);
    assert.ok(result.errors[0].includes('root must be'));
  }
});

test('rejects a backup whose schema is not v3', () => {
  const result = validateBackup(makeBackup({ schema: 'creator-compass-lite/v2' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('schema')));
});

test('rejects an item with a non-finite score', () => {
  const result = validateBackup(makeBackup({ items: [makeItem({ score: Number.NaN })] }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('items[0].score')));
});

test('rejects an item with score out of range', () => {
  const result = validateBackup(makeBackup({ items: [makeItem({ metric: 42 })] }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('metric must be between 1 and 10')));
});

test('rejects an item with a malformed date', () => {
  const result = validateBackup(makeBackup({ items: [makeItem({ date: '04/26/2026' })] }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('YYYY-MM-DD')));
});

test('rejects duplicate item ids', () => {
  const result = validateBackup(makeBackup({ items: [makeItem(), makeItem()] }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('duplicates')));
});

test('rejects items that are not objects', () => {
  const result = validateBackup(makeBackup({ items: ['not an item'] }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('items[0] must be an object')));
});

test('reports a clear error when items is missing', () => {
  const result = validateBackup({ schema: 'creator-compass-lite/v3' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('items must be an array')));
});

test('rejects oversized backups before they slow down local review', () => {
  const items = Array.from({ length: 251 }, (_, index) => makeItem({ id: `creator-compass-lite_${index}` }));
  const result = validateBackup(makeBackup({ items }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('250 or fewer')));
});

test('rejects malformed saved UI state', () => {
  const result = validateBackup(makeBackup({ ui: { search: [], category: 'all', status: 'all', selectedId: null } }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('ui.search must be a string')));
});

test('rejects selected UI ids that do not exist in the backup', () => {
  const result = validateBackup(makeBackup({ ui: { search: '', category: 'all', status: 'all', selectedId: 'missing-id' } }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('selectedId must match')));
});
