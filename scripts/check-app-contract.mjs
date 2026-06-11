#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { exit, stderr, stdout } from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;
const INDEX = join(ROOT, 'index.html');
const APP = join(ROOT, 'js/main.js');

function collect(pattern, text) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function unique(values) {
  return [...new Set(values)].sort();
}

function hasAttributeValue(html, attribute, value) {
  const quoted = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${attribute}=["']${quoted}["']`).test(html);
}

async function assertFileExists(relativePath, errors) {
  const cleanPath = normalize(relativePath.replace(/^\.\//, ''));
  if (cleanPath.startsWith('..')) {
    errors.push(`asset path escapes repo root: ${relativePath}`);
    return;
  }
  try {
    await access(join(ROOT, cleanPath));
  } catch {
    errors.push(`referenced asset is missing: ${relativePath}`);
  }
}

async function main() {
  const errors = [];
  const html = await readFile(INDEX, 'utf8');
  const js = await readFile(APP, 'utf8');

  const stylesheetHrefs = collect(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g, html);
  const moduleScripts = collect(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/g, html);
  for (const asset of [...stylesheetHrefs, ...moduleScripts]) await assertFileExists(asset, errors);

  if (!moduleScripts.includes('./js/main.js')) {
    errors.push('index.html must load ./js/main.js as a module script');
  }

  const requiredRoles = unique(collect(/document\.querySelector\('\[data-role="([^"']+)"\]'\)/g, js));
  const missingRoles = requiredRoles.filter((role) => !hasAttributeValue(html, 'data-role', role));
  for (const role of missingRoles) errors.push(`missing data-role="${role}" required by js/main.js`);

  const requiredFields = unique(collect(/document\.querySelector\('\[data-field="([^"']+)"\]'\)/g, js));
  const missingFields = requiredFields.filter((field) => !hasAttributeValue(html, 'data-field', field));
  for (const field of missingFields) errors.push(`missing data-field="${field}" required by js/main.js`);

  const requiredIds = unique(collect(/document\.querySelector\('\#([^"']+)'\)/g, js));
  const missingIds = requiredIds.filter((id) => !hasAttributeValue(html, 'id', id));
  for (const id of missingIds) errors.push(`missing id="${id}" required by js/main.js`);

  if (!html.includes('data-action="import"') || !html.includes('data-action="export"')) {
    errors.push('index.html must expose import and export buttons for local backups');
  }

  if (errors.length) {
    stderr.write(`app contract check failed with ${errors.length} problem(s):\n`);
    for (const error of errors) stderr.write(`  - ${error}\n`);
    return 1;
  }

  stdout.write(`ok: app contract matches ${requiredRoles.length} roles, ${requiredFields.length} fields, ${requiredIds.length} ids, and ${stylesheetHrefs.length + moduleScripts.length} assets\n`);
  return 0;
}

exit(await main());
