import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyBump, decideBump, latestRelease, TRACKED } from '../scripts/bump-pin.mjs';
import { findUnpinnedExternal } from '../scripts/check-external-pins.mjs';

const P = 'compound-engineering-v';
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const D = 'd'.repeat(40);

const entry = (ref, sha) => ({
  name: 'compound-engineering',
  source: { source: 'github', repo: 'EveryInc/compound-engineering-plugin', ref, sha },
  description: `Pinned to the commit of release tag ${ref}; bumps are reviewed PRs.`,
});

test('latestRelease orders by semver, not by text', () => {
  const out = [`${A}\trefs/tags/${P}3.9.4`, `${B}\trefs/tags/${P}3.30.5`, `${C}\trefs/tags/${P}3.10.0`].join('\n');
  assert.deepEqual(latestRelease(out, P), { ref: `${P}3.30.5`, sha: B, version: '3.30.5' });
});

test('latestRelease takes the peeled commit of an annotated tag', () => {
  const out = [`${A}\trefs/tags/${P}4.0.0`, `${D}\trefs/tags/${P}4.0.0^{}`].join('\n');
  assert.equal(latestRelease(out, P).sha, D);
  const reversed = [`${D}\trefs/tags/${P}4.0.0^{}`, `${A}\trefs/tags/${P}4.0.0`].join('\n');
  assert.equal(latestRelease(reversed, P).sha, D);
});

test('latestRelease ignores pre-releases, other prefixes and junk', () => {
  const out = [
    `${A}\trefs/tags/${P}3.0.0`,
    `${B}\trefs/tags/${P}9.0.0-beta.1`,
    `${C}\trefs/tags/v9.9.9`,
    `${D}\trefs/heads/${P}9.9.9`,
    'not a line',
  ].join('\n');
  assert.equal(latestRelease(out, P).ref, `${P}3.0.0`);
});

test('latestRelease returns null when there is no release', () => {
  assert.equal(latestRelease('', P), null);
});

test('decideBump returns null when already on the newest release', () => {
  assert.equal(decideBump(entry(`${P}3.30.5`, B), { ref: `${P}3.30.5`, sha: B, version: '3.30.5' }, P), null);
});

test('decideBump proposes a newer release', () => {
  const bump = decideBump(entry(`${P}3.30.5`, B), { ref: `${P}3.31.0`, sha: C, version: '3.31.0' }, P);
  assert.deepEqual(bump, { name: 'compound-engineering', fromRef: `${P}3.30.5`, fromSha: B, toRef: `${P}3.31.0`, toSha: C, version: '3.31.0' });
});

test('decideBump re-pins when the same tag now points elsewhere (moved tag)', () => {
  const bump = decideBump(entry(`${P}3.30.5`, B), { ref: `${P}3.30.5`, sha: C, version: '3.30.5' }, P);
  assert.equal(bump.toSha, C);
});

test('decideBump never proposes a downgrade', () => {
  assert.equal(decideBump(entry(`${P}3.30.5`, B), { ref: `${P}3.9.4`, sha: A, version: '3.9.4' }, P), null);
});

test('applyBump moves ref, sha and the description together without mutating', () => {
  const manifest = { plugins: [entry(`${P}3.30.5`, B)] };
  const bump = { name: 'compound-engineering', fromRef: `${P}3.30.5`, toRef: `${P}3.31.0`, toSha: C };
  const next = applyBump(manifest, bump);
  assert.equal(next.plugins[0].source.ref, `${P}3.31.0`);
  assert.equal(next.plugins[0].source.sha, C);
  assert.match(next.plugins[0].description, /release tag compound-engineering-v3\.31\.0;/);
  assert.equal(manifest.plugins[0].source.sha, B);
});

test('a bumped real manifest still passes the pin check', () => {
  const manifest = JSON.parse(readFileSync(new URL('../.claude-plugin/marketplace.json', import.meta.url), 'utf8'));
  for (const { name } of TRACKED) {
    const cur = manifest.plugins.find((p) => p.name === name);
    assert.ok(cur, `${name} is in the manifest`);
    const next = applyBump(manifest, { name, fromRef: cur.source.ref, toRef: `${P}99.0.0`, toSha: D });
    assert.deepEqual(findUnpinnedExternal(next), []);
  }
});
