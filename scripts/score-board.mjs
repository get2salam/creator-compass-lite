#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { argv, exit, stderr, stdout } from 'node:process';
import { validateBackup } from './check-backup.mjs';

const COMPLETED_STATES = new Set(['Published']);
const DAY_MS = 86_400_000;

function daysUntil(date, today) {
  return Math.round((new Date(`${date}T00:00:00`) - new Date(`${today}T00:00:00`)) / DAY_MS);
}

function addFinding(findings, item, severity, reason, recommendation) {
  findings.push({
    id: item.id,
    title: item.title,
    severity,
    reason,
    recommendation,
  });
}

export function scoreCreatorBoard(data, options = {}) {
  const validation = validateBackup(data);
  if (!validation.ok) {
    return { ok: false, score: 0, findings: [], errors: validation.errors };
  }

  const today = options.today || new Date().toISOString().slice(0, 10);
  const findings = [];
  const activeItems = data.items.filter((item) => !COMPLETED_STATES.has(item.state));

  for (const item of activeItems) {
    const dueIn = daysUntil(item.date, today);
    const leverage = item.score + item.metric - item.effort;

    if (dueIn < 0) {
      addFinding(
        findings,
        item,
        'high',
        `Review is ${Math.abs(dueIn)} day(s) overdue`,
        'Review the next move or move the project out of the active queue.',
      );
    } else if (dueIn <= 1 && item.metric <= 5) {
      addFinding(
        findings,
        item,
        'medium',
        'Review is imminent while momentum is weak',
        'Tighten the next move before the review window closes.',
      );
    }

    if (item.score >= 8 && item.metric <= 4) {
      addFinding(
        findings,
        item,
        'medium',
        'High potential project has low momentum',
        'Define the smallest visible action that can restore momentum.',
      );
    }

    if (item.effort >= 8 && leverage <= 4) {
      addFinding(
        findings,
        item,
        'low',
        'Friction is consuming most of the expected upside',
        'Reduce scope, delegate the draggiest step, or park it deliberately.',
      );
    }
  }

  const penalties = findings.reduce((total, finding) => {
    if (finding.severity === 'high') return total + 18;
    if (finding.severity === 'medium') return total + 10;
    return total + 6;
  }, 0);
  const queueBonus = activeItems.length > 0 && activeItems.length <= 5 ? 5 : 0;
  const score = Math.max(0, Math.min(100, 100 + queueBonus - penalties));

  return {
    ok: true,
    score,
    findingCount: findings.length,
    activeCount: activeItems.length,
    findings,
    errors: [],
  };
}

async function main(args) {
  const [file, todayFlag, todayValue] = args;
  if (!file) {
    stderr.write('usage: node scripts/score-board.mjs <backup.json> [--today YYYY-MM-DD]\n');
    return 2;
  }

  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    stderr.write(`could not read or parse ${file}: ${error.message}\n`);
    return 2;
  }

  const result = scoreCreatorBoard(parsed, { today: todayFlag === '--today' ? todayValue : undefined });
  if (!result.ok) {
    stderr.write(`cannot score invalid backup: ${file}\n`);
    for (const message of result.errors) stderr.write(`  - ${message}\n`);
    return 1;
  }

  stdout.write(`creator board score: ${result.score}/100 (${result.findingCount} finding(s), ${result.activeCount} active)\n`);
  for (const finding of result.findings) {
    stdout.write(`- [${finding.severity}] ${finding.title}: ${finding.reason}. ${finding.recommendation}\n`);
  }
  return result.score >= 70 ? 0 : 1;
}

if (import.meta.url === `file://${argv[1]}`) {
  exit(await main(argv.slice(2)));
}
