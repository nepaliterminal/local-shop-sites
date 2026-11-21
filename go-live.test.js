import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from './build.js';
import { goLive } from './go-live.js';

const base = 'https://example.com/shops';
function fixture(t, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'go-live-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'businesses'));
  const file = path.join(root, 'businesses/shop.json');
  fs.writeFileSync(file, JSON.stringify({ name: 'Shop', slug: 'shop', demo: true, ...extra }));
  build({ root, base, log: () => {} });
  return { root, file, html: () => fs.readFileSync(path.join(root, 'docs/shop/index.html'), 'utf8'), run: options => goLive('shop', { root, base, log: () => {}, ...options }) };
}

test('launch removes ribbon and indexing restrictions in both renderers and applies shallow edits', t => {
  for (const extra of [{}, { maps_url: 'https://example.com/maps', theme: 'fiesta' }]) {
    const f = fixture(t, extra);
    assert.match(f.html(), /class="ribbon"|noindex/);
    f.run({ edits: { phone: '555-0100', hours: { Monday: 'Closed' }, services: [{ name: 'Cut', price: '$20' }], about: 'Approved story', tagline: 'Approved tagline', photos: [] } });
    assert.doesNotMatch(f.html(), /class="ribbon"|noindex|unofficial website preview/);
    assert.match(f.html(), /rel="canonical" href="https:\/\/example.com\/shops\/shop\/"/);
    assert.match(f.html(), /555-0100/);
    assert.match(f.html(), /Approved story/);
    assert.equal(JSON.parse(fs.readFileSync(f.file)).demo, false);
    const index = fs.readFileSync(path.join(f.root, 'docs/index.html'), 'utf8');
    assert.match(index, /noindex, nofollow/);
    assert.doesNotMatch(index, /href="\.\/shop\//);
    assert.equal(fs.readFileSync(path.join(f.root, 'outreach/messages.txt'), 'utf8'), '');
  }
});

test('empty edits launch, repeat launch is safe, and dry-run writes nothing', t => {
  const f = fixture(t);
  const original = fs.readFileSync(f.file, 'utf8');
  const html = f.html();
  const logs = [];
  f.run({ dryRun: true, edits: { phone: '123' }, log: line => logs.push(line) });
  assert.equal(fs.readFileSync(f.file, 'utf8'), original);
  assert.equal(f.html(), html);
  assert.match(logs.join('\n'), /DRY RUN[\s\S]*\+ demo: false[\s\S]*No files written/);
  f.run();
  const live = f.html();
  f.run();
  assert.equal(f.html(), live);
});

test('bad edits, missing assets, invalid bases and protected fields preserve input and output', t => {
  const f = fixture(t);
  const original = fs.readFileSync(f.file, 'utf8');
  const html = f.html();
  for (const edits of [null, [], { mystery: 1 }, { slug: 'other' }, { demo: true }, { sample: false }, { hours: { Mon: 'Closed' } }, { phone: 123 }, { services: {} }, { photos: ['javascript:bad'] }, { photos: ['img/missing.jpg'] }, JSON.parse('{"__proto__":{}}')]) {
    assert.throws(() => f.run({ edits }));
  }
  assert.throws(() => f.run({ base: 'file:///bad' }));
  assert.throws(() => goLive('../shop', { root: f.root }));
  assert.equal(fs.readFileSync(f.file, 'utf8'), original);
  assert.equal(f.html(), html);
  const sample = fixture(t, { sample: true });
  assert.throws(() => sample.run(), /Fictional samples/);
});
