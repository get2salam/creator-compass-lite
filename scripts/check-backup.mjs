#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { argv, exit, stderr, stdout } from 'node:process';

const ITEM_FIELDS = {
  id: 'string',
  title: 'string',
  note: 'string',
  category: 'string',
  state: 'string',
  textOne: 'string',
  textTwo: 'string',
  date: 'string',
  score: 'number',
  effort: 'number',
  metric: 'number',
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateBackup(data) {
  const errors = [];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['root must be a JSON object'] };
  }
  if (typeof data.schema !== 'string' || !data.schema.endsWith('/v3')) {
    errors.push('schema must be a string ending in "/v3"');
  }
  if (!Array.isArray(data.items)) {
    errors.push('items must be an array');
    return { ok: errors.length === 0, errors };
  }

  const seenIds = new Set();
  data.items.forEach((item, index) => {
    const where = `items[${index}]`;
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${where} must be an object`);
      return;
    }
    for (const [field, expected] of Object.entries(ITEM_FIELDS)) {
      const value = item[field];
      if (typeof value !== expected) {
        errors.push(`${where}.${field} must be ${expected} (got ${value === null ? 'null' : typeof value})`);
        continue;
      }
      if (expected === 'number' && !Number.isFinite(value)) {
        errors.push(`${where}.${field} must be a finite number`);
      }
    }
    for (const range of ['score', 'effort', 'metric']) {
      const value = item[range];
      if (typeof value === 'number' && Number.isFinite(value) && (value < 1 || value > 10)) {
        errors.push(`${where}.${range} must be between 1 and 10 (got ${value})`);
      }
    }
    if (typeof item.date === 'string' && !ISO_DATE.test(item.date)) {
      errors.push(`${where}.date must be YYYY-MM-DD (got "${item.date}")`);
    }
    if (typeof item.id === 'string') {
      if (seenIds.has(item.id)) errors.push(`${where}.id duplicates an earlier item`);
      seenIds.add(item.id);
    }
  });

  return { ok: errors.length === 0, errors };
}

async function main(args) {
  const [file] = args;
  if (!file) {
    stderr.write('usage: node scripts/check-backup.mjs <backup.json>\n');
    return 2;
  }
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    stderr.write(`could not read or parse ${file}: ${error.message}\n`);
    return 2;
  }
  const result = validateBackup(parsed);
  if (result.ok) {
    stdout.write(`ok: ${file} looks like a valid creator-compass-lite v3 backup (${parsed.items.length} item(s))\n`);
    return 0;
  }
  stderr.write(`invalid backup: ${file}\n`);
  for (const message of result.errors) stderr.write(`  - ${message}\n`);
  return 1;
}

if (import.meta.url === `file://${argv[1]}`) {
  exit(await main(argv.slice(2)));
}
