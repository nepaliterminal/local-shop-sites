import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { build, normalize, render } from './build.js';
import { themes, themeFor, personalText } from './premium.js';

const base = 'https://example.com/demos';
const shop = { name: 'A Real Shop', slug: 'a-real-shop', category: 'salon', maps_url: 'https://www.google.com/maps/place/A+Real+Shop', demo: true, phone: '(703) 555-0100', hours: {}, rating: 4.9, reviewCount: 43 };
const page = overrides => render(normalize({ ...shop, ...overrides }), base);

test('listing categories automatically select distinct themes and hero treatments', () => {
  for (const [category, expected] of [['auto repair', 'industrial'], ['salon', 'editorial'], ['tailor', 'classic'], ['dry clean', 'classic'], ['food truck', 'streetfood'], ['restaurant', 'charcoal']]) {
    assert.equal(themeFor({ category }), expected);
    assert.match(page({ category }), new RegExp(`<body class="${expected}">`));
  }
  assert.match(page({ theme: 'industrial' }), /class="image-label"/);
  assert.match(page({ theme: 'editorial' }), /class="editorial-photos single"/);
  assert.match(page({ theme: 'streetfood' }), /class="truck-stamp"/);
  assert.match(page({ theme: 'fiesta' }), /<body class="fiesta">/);
});

test('all premium themes keep accessible core content, actual rating, and no invented prices', () => {
  for (const theme of themes) {
    const html = page({ theme, services: [{ name: 'A verified service' }], reviews: [{ author: 'Real R.', text: 'A real review excerpt.' }], photos: ['img/photo-1.jpg'], photoAlts: ['Verified listing photograph'] });
    for (const pattern of [/Skip to content/, /tel:7035550100/, /Get directions/, /Preview built for A Real Shop/, /<strong>4.9<\/strong>/, /\(43 reviews\)/, /Google ↗/, /A verified service/, /A real review excerpt\./, /title="Map to A Real Shop"/, /output=embed/, /src="img\/photo-1.jpg"/, /alt="Verified listing photograph"/, /https:\/\/example.com\/demos\/a-real-shop\/img\/photo-1.jpg/]) assert.match(html, pattern);
    assert.doesNotMatch(html, /class="price"|\$\d|<script src=/);
    assert.match(html, /noindex, nofollow/);
    const paid = page({ theme, demo: false });
    assert.doesNotMatch(paid, /Preview built for|noindex, nofollow/);
  }
});

test('empty hours show one honest call prompt rather than a fabricated weekly timetable', () => {
  const html = page({ hours: {} });
  assert.match(html, /Call for today's hours/);
  assert.doesNotMatch(html, /class="hours"|data-day="\d"|9 AM|Closed/);
  const empty = page({ reviews: [], services: [], phone: '' });
  assert.doesNotMatch(empty, /id="reviews"|href="tel:/);
  assert.match(empty, /Call for current services and pricing/);
  assert.match(empty, /class="photo-placeholder"/);
});

test('known hours highlight the visitor’s current day; missing hours script is safe', () => {
  for (let day = 0; day < 7; day++) {
    const html = page({ hours: { Monday: 'Closed', Tuesday: '8 AM–6 PM' } });
    assert.equal((html.match(/data-day="\d"/g) || []).length, 7);
    let active = false;
    let label;
    vm.runInNewContext(html.match(/<script>(.*?)<\/script>/s)[1], {
      Date: class { getDay() { return day; } },
      document: {
        querySelector: selector => { assert.equal(selector, `[data-day="${day}"]`); return { classList: { add: name => { active = name === 'today'; } }, firstElementChild: { append: node => { label = node; } } }; },
        createElement: () => ({})
      }
    });
    assert.ok(active);
    assert.equal(label.textContent, 'Today');
  }
  vm.runInNewContext(page().match(/<script>(.*?)<\/script>/s)[1], { document: { querySelector: () => null } });
});

test('new input rejects unsafe themes, links, local paths, and malformed optional content', () => {
  for (const override of [{ theme: '</style>' }, { themeCopy: [] }, { themeCopy: { unknown: 'label' } }, { themeCopy: { story: 7 } }, { maps_url: 'javascript:alert(1)' }, { photos: ['img/../../secret.jpg'] }, { photos: ['//example.com/tracker.jpg'] }, { photoAlts: 'wrong type' }, { outreachPraise: {}, rating: 4.9 }, { outreachPraise: 'the service', rating: null }, { unclaimed: 'yes' }]) assert.throws(() => normalize({ ...shop, ...override }));
  assert.match(page({ name: '<img src=x>', about: '</script><script>bad()</script>' }), /&lt;img src=x&gt;/);
  assert.doesNotMatch(page({ name: '<img src=x>' }), /<img src=x>/);
});

test('a barber can reuse the classic design without tailoring copy or unescaped labels', () => {
  const html = page({ category: 'barber', theme: 'classic', themeCopy: { services: 'A cut above.', story: 'Sharp cuts.\nA warm welcome.', closing: '<script>bad()</script>' } });
  assert.match(html, /A cut above\./);
  assert.match(html, /Sharp cuts\.<br>A warm welcome\./);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>bad/);
});

test('single-photo salons omit the second frame and image focal points stay safe', () => {
  const html = page({ photos: ['img/photo-1.jpg'], photoPositions: [0] });
  assert.match(html, /class="editorial-photos single"/);
  assert.doesNotMatch(html, /<div class="editorial-aside">|class="photo-placeholder"/);
  assert.match(html, /style="object-position:0% center"/);
  for (const photoPositions of ['left', [101], [-1], ['0; background:url(x)']]) assert.throws(() => normalize({ ...shop, photoPositions }));
});

test('local photos are copied on every build; missing photos preserve previous output', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shop-assets-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'businesses'));
  fs.mkdirSync(path.join(root, 'assets', shop.slug, 'img'), { recursive: true });
  const source = path.join(root, 'assets', shop.slug, 'img', 'photo-1.jpg');
  fs.writeFileSync(source, Buffer.from([1, 2, 3]));
  fs.writeFileSync(path.join(root, 'businesses', 'shop.json'), JSON.stringify({ ...shop, photos: ['img/photo-1.jpg'], outreachPraise: 'the color' }));
  const run = () => build({ root, base, log: () => {} });
  run();
  const destination = path.join(root, 'docs', shop.slug, 'img', 'photo-1.jpg');
  assert.deepEqual(fs.readFileSync(destination), fs.readFileSync(source));
    assert.match(fs.readFileSync(path.join(root, 'outreach', 'messages.txt'), 'utf8'), /4.9 star Google reviews, which praise the color/);
  run();
  assert.ok(fs.existsSync(destination));
  fs.unlinkSync(source);
  assert.throws(run, /missing local photo/);
  assert.ok(fs.existsSync(destination));
});

test('all eighteen real records use the chosen pitch and locally available photos', () => {
  const records = fs.readdirSync(new URL('./businesses/', import.meta.url)).map(file => JSON.parse(fs.readFileSync(new URL(`./businesses/${file}`, import.meta.url), 'utf8'))).filter(b => b.outreachPraise);
  assert.equal(records.length, 18);
  for (const b of records) {
    const text = personalText(b, `https://nepaliterminal.github.io/local-shop-sites/${b.slug}/`);
    assert.match(text, new RegExp(`^Hello `));
    assert.ok(text.includes(b.rating.toFixed(1)));
    assert.ok(text.includes(b.outreachPraise));
    assert.match(text, /It's a one-time fee of \$200, and you only pay if you decide to keep it\. Let me know if you'd like more info\.$/);
    assert.doesNotMatch(text, /Abhinav|Cash App|absubedi/);
    assert.ok(b.reviews.length >= 2 && b.reviews.length <= 4);
    assert.ok(b.reviews.every(r => r.text.length <= 220));
    assert.ok(b.services.every(s => !('price' in s)));
    for (const photo of b.photos) {
      assert.match(photo, /^img\//);
      assert.ok(fs.existsSync(new URL(`./assets/${b.slug}/${photo}`, import.meta.url)));
    }
    if (['chefs-doner', 'silk-road-grill'].includes(b.slug)) assert.deepEqual(b.hours, {});
  }
});
