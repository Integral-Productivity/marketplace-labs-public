#!/usr/bin/env node
// Proposes a bump of a SHA-pinned third-party plugin to its newest release tag.
// See devops-excellence ADR-097, decision 4:
//   - `ref` and `sha` move together, and `sha` is the commit the release tag
//     points to at the time of the run (read with `git ls-remote`, peeled).
//   - It runs weekly (see .github/workflows/bump-pins.yml). Skipped versions
//     are acceptable.
//   - It never merges. It only edits marketplace.json; the workflow opens a PR
//     that a human reviews against the upstream diff.
//
// The rules are pure functions so the tests can feed them violating inputs.

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;

// Plugins this script keeps current. `tagPrefix` is the upstream release-tag
// prefix; only tags `<prefix>X.Y.Z` (no pre-release suffix) count as releases.
export const TRACKED = [
  { name: 'compound-engineering', tagPrefix: 'compound-engineering-v' },
];

function parseVersion(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(s);
  return m ? m.slice(1).map(Number) : null;
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

// `lsRemote` is the text output of `git ls-remote --tags <url>`. Returns the
// newest release as { ref, sha, version }, or null when there is none. For an
// annotated tag the peeled `^{}` line names the commit, and it wins over the
// tag-object SHA.
export function latestRelease(lsRemote, tagPrefix) {
  const commits = new Map();
  for (const line of lsRemote.split('\n')) {
    const [sha, fullRef] = line.trim().split(/\s+/);
    if (!sha || !fullRef || !SHA.test(sha)) continue;
    if (!fullRef.startsWith('refs/tags/')) continue;
    let tag = fullRef.slice('refs/tags/'.length);
    const peeled = tag.endsWith('^{}');
    if (peeled) tag = tag.slice(0, -3);
    if (!tag.startsWith(tagPrefix)) continue;
    if (peeled || !commits.has(tag)) commits.set(tag, sha);
  }
  let best = null;
  for (const [ref, sha] of commits) {
    const version = parseVersion(ref.slice(tagPrefix.length));
    if (!version) continue;
    if (!best || compareVersions(version, best.version) > 0) best = { ref, sha, version };
  }
  return best && { ref: best.ref, sha: best.sha, version: best.version.join('.') };
}

// Decides the bump for one plugin entry. Returns null when the pin is already
// on the newest release, or when the newest release is OLDER than the current
// pin (never propose a downgrade).
export function decideBump(entry, release, tagPrefix) {
  if (!release) return null;
  const { ref, sha } = entry.source;
  if (ref === release.ref && sha === release.sha) return null;
  const current = typeof ref === 'string' && ref.startsWith(tagPrefix)
    ? parseVersion(ref.slice(tagPrefix.length))
    : null;
  if (current && compareVersions(parseVersion(release.version), current) < 0) return null;
  return { name: entry.name, fromRef: ref, fromSha: sha, toRef: release.ref, toSha: release.sha, version: release.version };
}

// Returns a new manifest with `ref`, `sha` and the version in the description
// moved together. Never mutates its input.
export function applyBump(manifest, bump) {
  const next = structuredClone(manifest);
  const entry = next.plugins.find((p) => p.name === bump.name);
  entry.source.ref = bump.toRef;
  entry.source.sha = bump.toSha;
  if (typeof entry.description === 'string' && bump.fromRef) {
    entry.description = entry.description.split(bump.fromRef).join(bump.toRef);
  }
  return next;
}

function main() {
  const path = process.argv[2] ?? '.claude-plugin/marketplace.json';
  let manifest = JSON.parse(readFileSync(path, 'utf8'));
  const bumps = [];
  for (const { name, tagPrefix } of TRACKED) {
    const entry = manifest.plugins.find((p) => p.name === name);
    if (!entry) throw new Error(`${name} is tracked but not in ${path}`);
    const url = `https://github.com/${entry.source.repo}.git`;
    const out = execFileSync('git', ['ls-remote', '--tags', url, `refs/tags/${tagPrefix}*`], { encoding: 'utf8' });
    const bump = decideBump(entry, latestRelease(out, tagPrefix), tagPrefix);
    if (!bump) {
      console.log(`${name}: up to date at ${entry.source.ref}`);
      continue;
    }
    bump.repo = entry.source.repo;
    console.log(`${name}: ${bump.fromRef} -> ${bump.toRef} (${bump.toSha})`);
    manifest = applyBump(manifest, bump);
    bumps.push(bump);
  }
  if (bumps.length) writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `bumps=${JSON.stringify(bumps)}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
