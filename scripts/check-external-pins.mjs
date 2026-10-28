#!/usr/bin/env node
// Fails when a plugin from a repository outside the org is not pinned to a
// commit. A branch or tag can be moved upstream; a commit cannot.
// See devops-excellence ADR-097, decision 5.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ORG = 'integral-productivity';
const COMMIT = /^[0-9a-f]{40}$/;

function ownerOf(source) {
  if (typeof source.repo === 'string') return source.repo.split('/')[0].toLowerCase();
  if (typeof source.url === 'string') {
    const m = source.url.match(/^(?:https:\/\/|git@)github\.com[/:]([^/]+)\//i);
    return m ? m[1].toLowerCase() : null; // null: not on GitHub, so external
  }
  return undefined; // no remote: a relative path inside this marketplace
}

// A commit pin is a 40-character `sha`. A commit in `ref` does not count:
// Claude Code clones `ref` as a branch or tag (`git clone --branch`), so a
// commit there fails every install ("Remote branch <sha> not found").
function isCommitPinned(source) {
  return COMMIT.test(source.sha ?? '');
}

// Pure rule over a parsed marketplace.json. Returns one message per violation.
export function findUnpinnedExternal(manifest) {
  const problems = [];
  for (const plugin of manifest.plugins ?? []) {
    const { source } = plugin;
    if (!source || typeof source !== 'object') continue;
    if (COMMIT.test(source.ref ?? '')) {
      problems.push(
        `${plugin.name}: ref ${source.ref} is a commit; ref takes a branch or tag, ` +
          `so move the commit to sha`,
      );
      continue;
    }
    const owner = ownerOf(source);
    if (owner === undefined || owner === ORG) continue;
    if (!isCommitPinned(source)) {
      problems.push(
        `${plugin.name}: source ${source.repo ?? source.url} is outside ${ORG} ` +
          `and has no 40-character sha (ref: ${source.ref ?? 'none'})`,
      );
    }
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] ?? '.claude-plugin/marketplace.json';
  const problems = findUnpinnedExternal(JSON.parse(await readFile(path, 'utf8')));
  if (problems.length > 0) {
    for (const p of problems) console.error(`::error file=${path}::${p}`);
    process.exit(1);
  }
  console.log(`${path}: every plugin from outside ${ORG} is pinned to a commit.`);
}
