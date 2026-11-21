# Local Shop Sites

Polished, single-page websites for neighborhood businesses. A zero-dependency Node generator turns one JSON file per business into GitHub Pages-ready HTML with inline styles and a tiny opening-hours script. No install, bundler, external JavaScript, or paid hosting required.

The two included businesses, **Cedar & Steel** and **Solcito Tacos**, are entirely fictional. Their contact details, prices, and hours are examples; photographs are illustrative Unsplash stock images. Their maps show city centers, not actual shop locations. No ratings or testimonials are invented.

## Build and preview

Requires Node.js 20 or newer:

```sh
node build.js
node --test
# Optional local server (if Python is available):
python3 -m http.server 8000 --directory docs
```

Open `http://localhost:8000/`. The collection page and all demo/sample pages are `noindex, nofollow`. The build is deterministic, replaces the entire generated `docs/` directory, removes obsolete slugs, and writes `outreach/messages.txt`. Do not edit generated files. Input is validated before `docs/` is replaced. Keep any hand-managed assets outside `docs/`; custom-domain configuration must be reapplied after builds (see below).

Default public base: `https://nepaliterminal.github.io/local-shop-sites`

```sh
PAGES_BASE=https://YOUR-USERNAME.github.io/local-shop-sites node build.js
```

`PAGES_BASE` controls canonical URLs, social metadata, structured-data URLs, and the filled-in outreach links. Use an http(s) URL without query/fragment/credentials. No secrets are needed.

## Add a business

Create `businesses/your-shop.json`. Copy a sample, or start small:

```json
{
  "name": "Your Shop",
  "slug": "your-shop",
  "category": "generic",
  "demo": true,
  "sample": false,
  "tagline": "Your neighborhood. Our passion.",
  "about": "A short, accurate introduction approved by the owner.",
  "phone": "(503) 555-0100",
  "address": "Your verified street address",
  "city": "Portland, OR",
  "hours": {
    "Monday": "9 AM – 5 PM",
    "Tuesday": "9 AM – 5 PM",
    "Wednesday": "9 AM – 5 PM",
    "Thursday": "9 AM – 5 PM",
    "Friday": "9 AM – 5 PM",
    "Saturday": "10 AM – 2 PM",
    "Sunday": "Closed"
  },
  "services": [
    { "name": "Verified service", "price": "$25", "description": "A short, accurate description." }
  ],
  "reviews": [],
  "photos": [],
  "accent": "#53664e",
  "mapsQuery": "Your Shop, verified street address, Portland OR"
}
```

Only `name` and `slug` are required. Slugs must be unique, lowercase alphanumeric words separated by hyphens. The category chooses default copy, colors, and an icon: `restaurant`, `salon`, `barber`, `auto repair`, `cleaning`, or `generic`. Unknown categories fall back to generic. Missing services display a contact prompt; missing hours say “Call for hours”; missing photos use a designed icon panel. Phone and map buttons appear only when the corresponding information exists.

- `hours`: full English day names, values as display strings. Today is highlighted using the visitor’s device date, not a live “open now” claim. Call ahead for holidays.
- `services`: array of `{ "name", "price", "description" }`; prices may be strings or numbers and are displayed as entered (include the currency). Missing prices show “Ask us.”
- `rating`: optional verified number from 1–5. `reviewCount`: optional verified positive integer. Both are required to emit an aggregate rating in schema.
- `reviews`: optional array of `{ "text": "Exact real excerpt", "author": "Public display name" }`. Leave empty unless actually verified; keep source links and dates in your private lead records. Never fabricate praise. Sample sites suppress all ratings/reviews.
- `photos`: optional array of http(s) image URLs you have permission to use. The first is the hero and OG image; later URLs are included in structured data. Images are remotely loaded, not downloaded. Avoid huge source images; use a compressed crop around 1200px wide. Verify availability and rights before launch; don’t reuse customer photos without permission.
- `accent`: optional six-digit hex color. Check contrast when changing it, especially the small labels on the light background.
- `mapsQuery`: precise Google Maps query, or it defaults to address plus city. The iframe uses `maps?q=…&output=embed` with no API key. Maps/images require an internet connection and load from third parties. Embeds can be blocked by browser/network settings; the directions link is an alternative.
- `demo: true`: shows the subtle “Preview built for…” ribbon and keeps the page out of search indexing. Set false after purchase. `sample: true` separately labels fictional businesses and keeps them noindex even if demo is false. Do not relabel a fictional sample as a real shop.

Rebuild after edits. Review the site at narrow and wide widths; verify phone links, directions, all seven days, prices, and spelling. Review generated outreach messages before sending; very long names/URLs may exceed a single text’s length.

## Publish on GitHub Pages

This repository starts locally on `main`, with no remote configured. Nothing has been pushed or published.

1. Create your own GitHub repository named `local-shop-sites`, then add its remote and push `main` when ready.
2. If the account/repo differs from the default, build with the correct `PAGES_BASE` first; commit both source and generated output.
3. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main → /docs → Save**.
4. Wait for Pages to deploy. Open the collection URL and `/cedar-and-steel/` (or another slug). `docs/.nojekyll` disables Jekyll.
5. After each change: `node build.js`, test, review, and commit the changed JSON, `docs/`, and messages. Push when ready. There is deliberately no automatic deployment workflow; generated output is committed.

`noindex` is not access control. Anyone with a link can view a preview; do not put private information in it. Be respectful about unofficial previews, do not imply owner approval, and take down on request. GitHub Pages has usage limits and terms; verify they suit a client's use and migrate if necessary. This is a static informational site, not payment processing, booking, or a backend.

## Find shops that don’t have websites

1. Search Google Maps for **"<category> near <city>"**, for example “barber near Portland”.
2. Open individual listings with no **Website** button. Check the business name in search too: a missing button does not prove there is no existing site.
3. Manually copy the public name, business phone, street address, city, and full weekly hours. Verify details before publishing. Don’t scrape, guess, or publish private contact data.
4. Note a few confirmed services/prices from owner-provided material. Use only real review excerpts and their public author names if appropriate; otherwise leave reviews empty. Record sources privately, not in this public repo. Never invent ratings or imply stock images depict the real premises.
5. Create the JSON with `demo: true`, build, inspect, then send a friendly personal message from `outreach/messages.txt`. Sample messages are clearly labeled **DO NOT SEND**. See [outreach/outreach.md](outreach/outreach.md) for copy, pricing, scope, and opt-out handling.

## After payment / handoff

- Agree in writing: **$200 one-time**, setup + one year of small edits from launch, payment only if they like it; Cash App **$absubedi**. Confirm receipt privately. Don’t put payment/customer records in the repo.
- Have the owner approve all text, photos, hours, prices, and map location. Remove `demo` or set it to false in **their** JSON, then rebuild; the preview ribbon and demo noindex tag disappear. Leave fictional samples labeled as samples.
- Give them the source and generated files; preferably move their site into a repository/account they own. For a standalone Pages repo, put their generated `index.html` at that repo’s configured publishing root. Update the build/output layout and canonical `PAGES_BASE` for a standalone deployment rather than leaving `/slug/` URLs pointing at this multi-demo collection.
- Optional custom domain: register it in the owner’s registrar account at actual cost (about $12/year, varies), configure Pages **Custom domain**, and follow GitHub’s current DNS/verification instructions. Enable HTTPS after DNS propagates. A domain applies to a Pages repository, **not a single slug** — use a separate repo for one customer’s domain. If keeping this generator, adapt its output for that standalone root and preserve a `CNAME` file: this multi-demo build wipes `docs/`, including any manually added `CNAME`.
- Give account access, renewal details, an export/backup, and an agreed way to request edits. Offer **$15/month optional updates after the included year**; never auto-enroll or double-bill.

## Checks

`node --test` covers category defaults, empty content, optional reviews/schema, escaping, unsafe input, duplicate slugs, invalid JSON, base URLs, stale output removal, and generated outreach. Build paths are relative to `build.js`, not the working directory. Tests use disposable fixture directories and do not change the real demos.
