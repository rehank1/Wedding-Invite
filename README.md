# Rehan & Siddiqua · Botanical Light wedding invitation

A light, botanical invitation for the **Nikah (Fri 18 Dec 2026)** and **Reception (Sat 19 Dec 2026)** at Krishna Lawns, Pune, built as a guided tour. It opens on blush paper in soft window light, where gold line-art flowers draw themselves around a Bodoni RS monogram. No framework, no server: HTML, CSS and a little JavaScript on GitHub Pages, with a Google Sheet behind it. (The earlier dark "Noir Royale" version is kept in `versions/noir-royale-v2.4/`.)

| Opening | I · The Couple | IV · The Evening (tour) | III · Your Duas |
|---|---|---|---|
| ![Opening](reports/screenshots/375/00-opening.png) | ![Couple](reports/screenshots/375/01-couple.png) | ![Tour](reports/screenshots/375/04-tour.png) | ![Duas](reports/screenshots/375/03-duas.png) |

WhatsApp / social preview: ![OG card](site/assets/img/og.jpg)

**The tour:** I The Couple · II The Invitation (Bismillah, families) · III Seal your dua (choose a blessing, sign it in gold, press the wax seal; it drops into a keepsake chest) · IV The Evening (a Victorian pocket watch: turn the hand through each moment at its real time; venue with directions/map/calendar) · V Save the Date (scratch the gold foil, flip countdown) · VI With Love. A chapter rail, a progress line and a floating dock (Directions · Calendar · Next) keep guests oriented.

**Pages**

| Address | For | What it does |
|---|---|---|
| `/` | Guests | The invitation. `?to=Name` greets the guest; `&e=nikah` shows only some events. |
| `/create/` | You | Make a personal link per guest: copy, WhatsApp share, QR code, live preview. |
| `/admin/` | You | Edit every word, event, story moment and photo with a live preview; download `content.json`. Passphrase + noindex. |
| `/dashboard/` | You | **Send an invite** (Both / Nikah only / Reception only), duas sent, After Hours sign-ups, headcount, hype and picks, plus your Looker Studio report. Passphrase + noindex. |

> The passphrase on /admin and /dashboard is **obscurity, not security**. The site is static, so anyone determined can read the files. Nothing private is exposed anyway: the editor only produces a file you upload yourself, and the dashboard only shows totals (no names). Real data lives in your Google Sheet.

---

## First page

The opening is drawn entirely in code (no images or video): gold botanicals grow stroke by stroke around the monogram ([site/assets/js/botanic.js](site/assets/js/botanic.js)), blossoms drift down, and the names and "Open the invitation" rise in. Reduced-motion guests see it complete and still.

## Music

The invitation has its own gentle score, generated live in the browser ([site/assets/js/music.js](site/assets/js/music.js)): harp-like arpeggios over a soft string pad in D major, with an occasional kanun-like melody and a hall reverb. It fades in just after the guest opens the invitation (browsers only allow sound after a tap; on iPhone it starts with their next tap) and the ♪ button mutes it, remembered per guest. To use your own track instead, put an MP3 in `site/content/music/` and set `music.src` (e.g. `content/music/nasheed.mp3`).

## 1. Quick start (on this PC)

```bash
npm.cmd install
```

```bash
npm.cmd run build
```

```bash
npm.cmd run serve
```

Then open http://localhost:4173/. (In PowerShell use `npm.cmd`/`npx.cmd`; plain `npm` is blocked by the script policy.)

Folder map:

```
site/                  ← the website source (what you edit)
  index.html             invitation
  create/ admin/ dashboard/
  content/content.json   ← all the words, dates, links
  content/photos/        hero.jpg, gallery/, story/
  content/music/         optional .mp3
  assets/css|js|fonts|img
apps-script/Code.gs    ← RSVP backend for Google Sheets
scripts/               build, serve, photos, fonts, og image, lighthouse, ramadan comparison
tests/                 Playwright tests
reports/               test report, screenshots, Lighthouse
dist/                  build output (not committed)
```

## 2. Filling in content

Two ways; both end with a new `site/content/content.json` in the repository.

**A. In the browser (/admin).** Open `https://<your-site>/admin/`, edit, check the live preview, press **Download content.json**. On github.com open `site/content/content.json` → pencil icon → select all → paste the downloaded file's contents (or use "Add file → Upload files" into `site/content/`) → **Commit changes**. The Pages workflow redeploys in about a minute. "Copy JSON" puts the same text on your clipboard.

**B. Directly on github.com.** Open `site/content/content.json`, press the pencil, edit, commit. GitHub shows a red mark if the JSON is broken; the deploy workflow also refuses to publish broken JSON.

Every field is explained in plain English in [site/content/README.md](site/content/README.md). Missing content is tracked in [TODO.md](TODO.md).

## 3. Design system (Botanical Light)

Tokens live at the top of [site/assets/css/base.css](site/assets/css/base.css); the light edition's component styles are in [site/assets/css/botanical.css](site/assets/css/botanical.css) (layered over `tour.css`).

| Role | Token | Value | Rule |
|---|---|---|---|
| Paper | `--paper`, `--card`, `--blush` | #F3EAE1 · #FBF7F2 · #E7D2C7 | surfaces only |
| Ink | `--ivory` (reading text) | #2F2520 | ≈13:1 on paper |
| Secondary | `--mist` | #6B5B50 | ≈5.6:1 |
| Gold | `--gold`, `--gold-hi`, `--gold-grad` | #8A6A2E · #C9A85E | names, key facts, anything pressable (deep gold for small text) |
| Rose | `--rose` | #B77A72 | wax seal and the duas moment |
| Type | `--display` · `--serif` · `--sans` · `--arabic` | Bodoni Moda · Cormorant italic · Jost · Amiri | |

The monogram is the `#mono` symbol at the top of `site/index.html` (an upright R and italic S with a gold sprig); the first-page monogram is in the `.art` SVG of the opening.


## 5. Google Analytics 4

1. analytics.google.com → Admin → Create property → Web stream with your site URL. Copy the **Measurement ID** (`G-…`).
2. Put it in `site.ga4` (via /admin). GA is only loaded after a guest taps **Allow** on the small consent bar; with the placeholder `G-XXXXXXX` nothing loads at all.
3. Custom events sent: `invite_open`, `personalised_open`, `rsvp_submit`, `maps_click`, `calendar_add`, `egg_unlock`. In GA → Admin → Custom definitions, register `event_id`, `kind`, `attending`, `guests` as event-scoped dimensions if you want them in reports.

## 6. Looker Studio (visits on the dashboard)

1. lookerstudio.google.com → Create → Report → add the **Google Analytics** connector → pick your property.
2. Add a few charts (Users by day, Event count by event name, Top cities). Style: background `#FFFDF5`, series `#0B3D2E` and `#8A6E3A`, font Jost.
3. Share → Manage access: "Anyone with the link can view". Then **File → Embed report → Enable embedding** and copy the embed URL (`https://lookerstudio.google.com/embed/reporting/…`).
4. Paste it into `site.lookerUrl`. It appears at the bottom of /dashboard in a sandboxed frame.

## 7. Backend: Google Apps Script → Google Sheet (step by step)

The Sheet collects **duas** (one row per sealed dua: the words and whether it was signed) and **After Hours sign-ups** (name, hype, headcount). There is no RSVP form any more.

1. Create a new Google Sheet, e.g. "Wedding invite".
2. **Extensions → Apps Script.** Delete the sample code and paste the whole of [apps-script/Code.gs](apps-script/Code.gs). Optionally show and paste [apps-script/appsscript.json](apps-script/appsscript.json) (India time).
3. **Deploy → New deployment → type: Web app.** Execute as: **Me**. Who has access: **Anyone**. Approve the permissions (Advanced → Go to project; it's your own script).
4. Copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`) into `site.rsvpEndpoint` and publish content.json.
5. Test: send a dua on the live site; a row appears in the `Duas` tab. `…/exec?action=stats` returns the totals the dashboard uses.
6. After editing the script, **Deploy → Manage deployments → Edit → New version** keeps the same URL.

It validates everything on the server, drops honeypot submissions, blocks spreadsheet formula injection, rate-limits with CacheService (Apps Script can't see IPs), and returns only totals. No keys or secrets anywhere.

## 8. Deploying on GitHub Pages

1. Create a repository (e.g. `wedding-invite`) and push this folder (`main` branch).
2. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Every push to `main` runs [.github/workflows/pages.yml](.github/workflows/pages.yml): `npm ci`, validate content.json, `npm run build`, deploy `dist/`. Pull requests run the Playwright + Lighthouse suite ([test.yml](.github/workflows/test.yml)).
4. Your site appears at `https://<user>.github.io/<repo>/`. Put that in `site.url`.

### Custom domain + HTTPS

1. Settings → Pages → Custom domain → e.g. `rehanandsiddiqua.com` → Save.
2. At your domain registrar add DNS records: for an apex domain four `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and `AAAA` `2606:50c0:8000::153` … `8003::153` if offered); for `www` a `CNAME` to `<user>.github.io`.
3. Wait for the DNS check to pass, then tick **Enforce HTTPS** (the certificate can take up to an hour).
4. Update `site.url` to the new address.

## 9. Generating invites

Open `/create/`, choose an honorific, type the guest's name (60 characters max), tick their celebrations. You get:

- the link, e.g. `…/?to=Janab+Imran+Shaikh&e=nikah` (only the Nikah is shown to them),
- **Copy link**, **Share on WhatsApp** (pre-written Assalamu Alaikum message), **Open**,
- a QR code (download as PNG for printed cards),
- a live phone preview.

Names are cleaned (angle brackets and control characters removed), capped at 60 characters, URL-encoded, and always rendered as plain text.

## 10. The easter egg

Hidden on purpose. Scroll to the very end and tap the **small monogram 7 times quickly** (there is no visual hint), or type the **Konami code** (↑ ↑ ↓ ↓ ← → ← → B A). The card flips to **After Hours**: afterparty details, the house note, a "How hyped are you?" slider, **Pick your poison** (Coke · Green · Barood · LSD · Shroom · Open to anything and everything) and a headcount. **Count me in** saves it to the Sheet; the dashboard charts hype and picks.

Heads-up: picks are stored next to each guest's name in your Google Sheet. Keep that Sheet private.

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| Site shows the old text | Hard refresh. Check the Actions tab: the deploy may have failed because content.json is not valid JSON. |
| "Preview mode: not saved" | `site.rsvpEndpoint` is empty. Follow section 7. |
| Sign-ups fail with an error | Re-deploy the Apps Script as **Anyone** access and make sure the URL ends in `/exec`, not `/dev`. |
| Videos don't play | Phones on Data Saver or 2G, and reduced-motion settings, get the still poster on purpose. |
| WhatsApp shows no picture | Set `site.url` (absolute https address) and redeploy. WhatsApp caches previews for days; test with a new `?v=2` on the link. |
| Map doesn't show | Paste your own Google Maps share link into `mapsUrl`; the button "Open in Maps" always works. |
| Arabic shows boxes | The Amiri font is subset to the Arabic letters in content.json during the build; rebuild after changing Arabic text. |
| Forgot the passphrase | In /admin's file (or github.com) set `site.passHash` to `""`, publish, then set a new one in /admin. |
| Opening shows every visit | It is skipped for the rest of the browser session after the first open. Add `?skip=1` to a link to skip it. Preview other phases with `?mode=week`, `?mode=day` or `?mode=after`. |
| `npm` "running scripts is disabled" | Use `npm.cmd` / `npx.cmd` in PowerShell, or Git Bash. |

## 12. Testing

```bash
npx.cmd playwright test
```

```bash
npm.cmd run lighthouse
```

See [reports/TEST-REPORT.md](reports/TEST-REPORT.md) for what is covered and the latest results. Other scripts: `node scripts/og.mjs` (regenerate the share image, needs `npm run serve`), `node scripts/compare-ramadan.mjs` (side-by-side with the Ramadan app), `npm.cmd run fonts` (re-subset fonts).

## Privacy & security notes

- Strict Content-Security-Policy meta tag on every page (hashed inline CSS, no `unsafe-inline`/`unsafe-eval`), `referrer` policy, sandboxed iframes, no `innerHTML` with any data, self-hosted fonts and scripts (so no third-party CDN; gtag.js is the only remote script and is loaded only after consent; SRI is not possible for it because Google changes it).
- Guest names travel only in links you share; pages contain nothing private.
- No keys or secrets in the repository. `npm audit`: 0 vulnerabilities.
- GitHub Pages cannot send custom HTTP headers, so `frame-ancestors` (clickjacking) cannot be enforced from a meta tag.
