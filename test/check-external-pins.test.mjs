import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findUnpinnedExternal } from '../scripts/check-external-pins.mjs';

const SHA = '50532b00de523980010d97fe950965b35382a3b7';
const one = (source) => ({ plugins: [{ name: 'p', source }] });

test('the real manifest passes', async () => {
  const manifest = JSON.parse(await readFile('.claude-plugin/marketplace.json', 'utf8'));
  assert.deepEqual(findUnpinnedExternal(manifest), []);
});

test('mutation: removing the sha from compound-engineering fails', async () => {
  const manifest = JSON.parse(await readFile('.claude-plugin/marketplace.json', 'utf8'));
  const entry = manifest.plugins.find((p) => p.name === 'compound-engineering');
  assert.ok(entry, 'compound-engineering is listed');
  delete entry.source.sha;
  const problems = findUnpinnedExternal(manifest);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^compound-engineering: /);
});

test('external repo pinned only to a tag fails', () => {
  assert.equal(findUnpinnedExternal(one({ source: 'github', repo: 'EveryInc/x', ref: 'v1.0.0' })).length, 1);
});

test('external repo with no ref fails', () => {
  assert.equal(findUnpinnedExternal(one({ source: 'github', repo: 'EveryInc/x' })).length, 1);
});

test('a short sha is not a commit pin', () => {
  assert.equal(findUnpinnedExternal(one({ source: 'github', repo: 'EveryInc/x', sha: '50532b0' })).length, 1);
});

test('external repo with a 40-character sha passes', () => {
  assert.deepEqual(findUnpinnedExternal(one({ source: 'github', repo: 'EveryInc/x', ref: 'v1', sha: SHA })), []);
});

test('a commit in ref fails, because ref is cloned as a branch or tag', () => {
  const problems = findUnpinnedExternal(one({ source: 'github', repo: 'mattpocock/skills', ref: SHA }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /move the commit to sha/);
});

test('a commit in ref fails for an org repo too', () => {
  assert.equal(findUnpinnedExternal(one({ source: 'github', repo: 'Integral-Productivity/x', ref: SHA })).length, 1);
});

test('external repo pinned by sha alone passes', () => {
  assert.deepEqual(findUnpinnedExternal(one({ source: 'github', repo: 'mattpocock/skills', sha: SHA })), []);
});

test('external url source without a sha fails', () => {
  assert.equal(findUnpinnedExternal(one({ source: 'url', url: 'https://github.com/EveryInc/x.git' })).length, 1);
  assert.equal(findUnpinnedExternal(one({ source: 'url', url: 'https://gitlab.com/a/b.git' })).length, 1);
});

test('org repos may track a branch, in any letter case', () => {
  assert.deepEqual(findUnpinnedExternal(one({ source: 'github', repo: 'Integral-Productivity/x', ref: 'main' })), []);
  assert.deepEqual(findUnpinnedExternal(one({ source: 'url', url: 'https://github.com/integral-productivity/x.git' })), []);
});

test('relative path sources are ignored', () => {
  assert.deepEqual(findUnpinnedExternal({ plugins: [{ name: 'p', source: './plugins/p' }] }), []);
});
