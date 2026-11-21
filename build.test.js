import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, firstText, normalize, render } from './build.js';

const base = 'https://example.com/previews';
const minimal = { name: 'Test Shop', slug: 'test-shop' };
const page = data => render(normalize({ ...minimal, ...data }), base);
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'local-shop-test-'));
  fs.mkdirSync(path.join(root, 'businesses'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, write: (name, data) => fs.writeFileSync(path.join(root, 'businesses', `${name}.json`), JSON.stringify(data)), run: options => build({ root, base, log: () => {}, ...options }) };
}

test('all category defaults render without inventing reviews or services', () => {
  for (const category of ['barber', 'salon', 'restaurant', 'auto repair', 'cleaning', 'generic', 'unknown', '__proto__', 'constructor']) {
    const b = normalize({ ...minimal, category });
    const html = render(b, base);
    assert.ok(b.accent.startsWith('#'));
    assert.ok(b.tagline);
    assert.match(html, /Contact us for current services and pricing/);
    assert.match(html, /Call for hours/);
    assert.doesNotMatch(html, /id="reviews"|aggregateRating|href="tel:|<iframe/);
    assert.equal((html.match(/data-day="\d"/g) || []).length, 7);
  }
});

test('normal site includes verified content, map, metadata and links', () => {
  const html = page({ phone: '(503) 555-0100', city: 'Portland', address: '12 Main St', hours: { Monday: 'Closed' }, services: [{ name: 'Cut', price: '$30', description: 'A cut' }], rating: 4.8, reviewCount: 12, reviews: [{ text: 'Real review', author: 'Customer' }], photos: ['https://example.com/photo.jpg'] });
  for (const pattern of [/tel:5035550100/, /output=embed/, /q=12%20Main%20St%2C%20Portland/, /og:image/, /"@type":"LocalBusiness"/, /"ratingValue":4.8/, /Real review/, /\$30/, /Closed/]) assert.match(html, pattern);
  assert.doesNotMatch(html, /name="robots"|Preview built for/);
});

test('demo flag is removable; sample identity and noindex remain independent', () => {
  assert.match(page({ demo: true }), /Preview built for Test Shop/);
  assert.match(page({ demo: true }), /noindex, nofollow/);
  assert.doesNotMatch(page({ demo: false }), /Preview built for|name="robots"/);
  const sample = page({ sample: true, demo: false, rating: 5, reviewCount: 10, reviews: [{ text: 'Never show this', author: 'Fake' }] });
  assert.match(sample, /Fictional sample/);
  assert.match(sample, /noindex, nofollow/);
  assert.doesNotMatch(sample, /Preview built for|Never show this|aggregateRating/);
  assert.doesNotMatch(page({ rating: 4.8 }), /aggregateRating/);
});

test('user content is escaped in HTML and cannot break structured data scripts', () => {
  const html = page({ name: '<script>alert(1)</script>', about: '</script><img src=x onerror=alert(1)>', accent: 'red;display:none', reviews: [{ text: '<b>review</b>', author: '"author"' }] });
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<img src=x|<b>review<\/b>|red;display:none/);
  const schema = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
  assert.equal(JSON.parse(schema).description, '</script><img src=x onerror=alert(1)>');
});

test('malformed input and dangerous paths or URLs fail explicitly', () => {
  for (const data of [{ name: '' }, { slug: '../escape' }, { slug: 'Bad Slug' }, { services: {} }, { services: [null] }, { reviews: [{ text: 'Missing author' }] }, { photos: ['javascript:alert(1)'] }, { hours: { Mon: '9–5' } }, { hours: [] }, { demo: 'yes' }, { category: {} }, { rating: 6 }, { reviewCount: -1 }]) {
    assert.throws(() => normalize({ ...minimal, ...data }));
  }
});

test('build writes predictable files and outreach, removes stale output', t => {
  const f = fixture(t);
  f.write('shop', { ...minimal, demo: true });
  f.run({ base: `${base}/` });
  assert.ok(fs.existsSync(path.join(f.root, 'docs', '.nojekyll')));
  assert.match(fs.readFileSync(path.join(f.root, 'docs', 'index.html'), 'utf8'), /noindex, nofollow/);
  assert.match(fs.readFileSync(path.join(f.root, 'outreach', 'messages.txt'), 'utf8'), /https:\/\/example.com\/previews\/test-shop\//);
  const first = fs.readFileSync(path.join(f.root, 'docs', 'test-shop', 'index.html'), 'utf8');
  fs.writeFileSync(path.join(f.root, 'docs', 'stale.html'), 'old');
  f.run();
  assert.equal(fs.readFileSync(path.join(f.root, 'docs', 'test-shop', 'index.html'), 'utf8'), first);
  assert.ok(!fs.existsSync(path.join(f.root, 'docs', 'stale.html')));
});

test('empty business directory builds an empty collection and messages', t => {
  const f = fixture(t);
  assert.deepEqual(f.run(), []);
  assert.match(fs.readFileSync(path.join(f.root, 'docs', 'index.html'), 'utf8'), /No demos yet/);
  assert.equal(fs.readFileSync(path.join(f.root, 'outreach', 'messages.txt'), 'utf8'), '');
});

test('invalid JSON, duplicate slugs and bad bases preserve previous output', t => {
  const f = fixture(t);
  f.write('one', minimal);
  f.run();
  const output = path.join(f.root, 'docs', 'test-shop', 'index.html');
  const initial = fs.readFileSync(output, 'utf8');
  f.write('two', minimal);
  assert.throws(() => f.run(), /Duplicate business slug/);
  fs.writeFileSync(path.join(f.root, 'businesses', 'two.json'), '{broken');
  assert.throws(() => f.run(), /two.json/);
  for (const bad of ['file:///tmp', 'https://example.com/?query=1', 'https://example.com/#hash', 'https://user:password@example.com']) assert.throws(() => f.run({ base: bad }));
  assert.equal(fs.readFileSync(output, 'utf8'), initial);
});

test('first text matches outreach template and stays under 320 characters', () => {
  const text = firstText('{name}', '{link}');
  assert.ok(text.length < 320);
  const outreach = fs.readFileSync(new URL('./outreach/outreach.md', import.meta.url), 'utf8');
  assert.ok(outreach.includes(text));
  assert.match(text, /\$200 one-time includes setup \+ 1 year of edits/);
  assert.match(text, /Pay only if you like it, via Cash App \$absubedi/);
});
