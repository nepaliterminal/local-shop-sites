#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, normalize } from './build.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const editable = ['name', 'phone', 'hours', 'services', 'about', 'tagline', 'photos', 'photoAlts', 'photoPositions', 'address', 'city', 'mapsQuery', 'locationNote'];

export function goLive(slug, { root = ROOT, edits = {}, dryRun = false, base, log = console.log } = {}) {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Supply a valid shop slug');
  if (!edits || typeof edits !== 'object' || Array.isArray(edits)) throw new Error('Edits must be a JSON object');
  for (const key of Object.keys(edits)) {
    if (!editable.includes(key)) throw new Error(`Unknown or protected edit key: ${key}`);
  }
  const file = `${slug}.json`;
  const source = path.join(root, 'businesses', file);
  const original = fs.readFileSync(source, 'utf8');
  const before = JSON.parse(original);
  if (before.slug !== slug) throw new Error('Filename must match the business slug');
  if (before.sample) throw new Error('Fictional samples cannot go live');
  const after = { ...before, ...edits, demo: false };
  normalize(after, file);
  build({ root, base, overrides: { [file]: after }, validateOnly: true });
  log(`${dryRun ? 'DRY RUN' : 'GO LIVE'}: businesses/${file}`);
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      log(`- ${key}: ${JSON.stringify(before[key]) ?? '(missing)'}`);
      log(`+ ${key}: ${JSON.stringify(after[key])}`);
    }
  }
  log('Remove preview ribbon and noindex; retain canonical from PAGES_BASE + /' + slug + '/.');
  log('Exclude shop from demo gallery and outreach; rebuild all docs.');
  if (dryRun) { log('No files written.'); return after; }
  fs.writeFileSync(source, JSON.stringify(after, null, 2) + '\n');
  try { build({ root, base, log }); }
  catch (error) { fs.writeFileSync(source, original); throw error; }
  log('Built locally. Commit and deploy docs to publish; confirm the final link before collecting payment.');
  return after;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const positional = args.filter(arg => arg !== '--dry-run');
    if (positional.length < 1 || positional.length > 2 || positional.some(arg => arg.startsWith('--'))) throw new Error('Usage: node go-live.js <slug> [edits.json] [--dry-run]');
    const [slug, editsFile] = positional;
    goLive(slug, { dryRun, edits: editsFile ? JSON.parse(fs.readFileSync(editsFile, 'utf8')) : {} });
  } catch (error) { console.error(`Go-live failed: ${error.message}`); process.exitCode = 1; }
}
