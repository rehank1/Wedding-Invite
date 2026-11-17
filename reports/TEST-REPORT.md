# Test report · 2026-11-16

## Update: cinematic logo reveal (v2.3.0)
- `tests/cine.spec.js` (6 tests, all passing): WebGL run at **375 px and 1440 px** on the real GPU (Intel HD 520 via ANGLE/D3D11, a fair stand-in for a mid-range phone): **p95 frame 16.8 ms (60 fps)**, zero console errors, CLS < 0.01, and it crossfades into the opening; **GIFs** recorded to `reports/cine/intro-375.gif` and `intro-1440.gif`. Software GPU (SwiftShader) → automatically uses the SVG version. **Skip** ends it immediately and hands over; plays once per session. **Reduced motion** → still logo, no canvas. Sound muted until tapped.
- Cold first visit: two short stalls (50–67 ms) when the glow starts tracing; warm runs are a clean 16.7 ms. Fixed on the way: shader compile now happens before the clock starts; the intro waits for the page underneath to render; background films start after the intro; the metal finish is pre-painted and crossfaded (removed a 250 ms stall); the opening screen's title no longer shifts when its font loads.
- Size: `cine.js` 5.7 KB gzipped, no library. Final run: 375 px and 1440 px both **60 fps avg, p95 16.7–16.8 ms**, CLS < 0.01 after reserving the guest-name line.

---

## Update: Noir Royale (v2.2.0) — chapter tour, liquid gold, Victorian crest, pocket watch, seal-your-dua
- Suites rewritten for the new experience: opening, generator → single-celebration invite, **seal your dua** (choose, sign in gold, seal → POST + chest count from the Sheet; own words; keyboard-only), **pocket watch** (tap a jewel, arrow keys, Home, drag the hand, switch celebrations; venue map/directions/.ics/Google), dock + chapter rail, countdown + scratch foil, **hidden egg** (6 taps do nothing, 7 open it; picks sent), Konami, time-aware phases (week/day/after), background video loader (orientation-aware liquid gold, reduced motion → poster only), admin, gate, dashboard (duas, hype, picks), analytics consent, manifest/service worker, XSS and CSP checks, cross-browser smoke.
- Lighthouse (this PC): invite desktop **100 / 100 / 100 / 100**, CLS 0; invite mobile **82–91** / 100 / 100 / 100 (LCP 0.8–1.0 s, CLS ≤ 0.008). Tool pages 93–100 / 100 / 100 / 63 (SEO 63 by design: noindex).
- Fixed during this round: the footer shifted behind the opening screen (CLS 0.33 on desktop) → page body hidden from first paint; tool pages lost their dark background (stale token) → contrast restored; the watch's sweeping seconds hand repainted the whole dial every frame → both hands now on their own compositor layers; dot/jewel tap targets no longer overlap.
- Scripted fast-scroll smoothness: p95 ≈ 33 ms (mean ≈ 19 ms) while each chapter renders for the first time; under the 50 ms limit.
- Videos shipped: galaxy 461 KB, roses 192 KB, beam 216 KB, liquid gold 1.4 MB (landscape) / 1.9 MB (portrait), all lazy, posters first.

---

## Update: royal redesign (v1.1.0)
- Playwright: **54 / 54 passed** (2 new tests: gatefold intro sequence, scratch-to-reveal by drag and by keyboard). Earlier flakes in the Konami focus and scratch tests were fixed (focus now set when the dialog opens; scratch threshold 40%).
- Scroll smoothness after the redesign: first build with live backdrop blur on every card measured p95 33–67 ms per frame. Cards now use a pre-frosted skin (live blur kept only on fixed controls, Skip and dialogs): **p95 16.7–16.8 ms (60 fps), CLS 0** in three isolated runs.
- Lighthouse after the redesign: desktop **100 / 100 / 100 / 100**; mobile Performance **72–94** across four runs (Accessibility, Best practices and SEO 100; LCP 1.9–2.1 s; CLS ≤ 0.001). Mobile is still below the 95 target on this PC (see the original notes below on why runs swing here).
- Initial transfer: 127 KB (was 106 KB) for the doors, plaque, royal CSS and tilt/scratch script.
- Decorative orbs/florals intentionally overflow the hero and are clipped; the overflow check ignores them.

---

Build: `node scripts/build.mjs` → `dist/`. Machine: Windows 11 Pro, Node 24.21, Playwright (Chromium 1255, WebKit 2388), system Chrome + Edge.

## Summary

| Area | Result |
|---|---|
| Playwright suite | **52 / 52 passed**, 0 flaky on the final run (`reports/playwright-results.json`, HTML in `reports/playwright-html/`, log `reports/playwright-output.txt`) |
| Browsers | Chromium desktop, Edge desktop, WebKit desktop (Safari engine), WebKit iPhone 13, Chromium Pixel 7. **Firefox: not run locally** (the Playwright Firefox binary is blocked from launching on this PC, `spawn UNKNOWN`); it runs in the GitHub Actions test workflow. |
| Console errors | 0 on all pages and flows (asserted in every flow test) |
| Broken links | 0 (every same-origin link, script, stylesheet and image on all four pages fetched → 200) |
| XSS | 7 `?to=` payloads, `?e=` junk, hostile content.json (11 fields), generator, admin, RSVP: no script execution, no injected elements, no `javascript:`/`data:` links |
| `npm audit` | 0 vulnerabilities (`reports/npm-audit.json`) |
| CLS | 0 (Lighthouse) · 0.0000 (in-page observer) |
| Scroll smoothness | p95 frame 16.8 ms over a full-page scroll (Chromium, 390 px) |
| Envelope | seal → card in ~1.65 s (measured in-page, < 2 s asserted) |
| Initial transfer | 106 KB (gzip) incl. fonts; HTML 11.9 KB, JS 11.4 KB gzipped. Budget < 200 KB ✔ |
| Ramadan comparison | Distinct (see below) |

## Lighthouse (`reports/lighthouse/`)

Three runs on this PC; scores are Performance / Accessibility / Best practices / SEO.

| Page | Run 1 | Run 2 | Run 3 | LCP | CLS |
|---|---|---|---|---|---|
| Invite, mobile (slow 4G, 4× CPU) | 92 / 100 / 100 / 100 | 90 / 100 / 100 / 100 | 94 / 100 / 100 / 100 | 1.7–1.8 s | 0 |
| Invite, desktop | 96 / 100 / 100 / 100 | 98 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 0.4 s | 0 |
| Invite `?to=`, mobile | 87 | 75 | 93 | 1.7–1.8 s | 0 |
| Invite `?to=`, desktop | 91 | 100 | 100 | 0.4 s | 0 |
| /create, /admin, /dashboard (desktop) | 88–100 / 100 / 100 / 63 | | | ≤ 0.6 s | ≤ 0.012 |

**Gap, stated plainly:** the brief asks for 95+ on all four scores. Accessibility, Best practices and SEO are 100 on the invite. **Mobile Performance is 90–94, not 95**, because of Total Blocking Time (270–500 ms; one outlier 1,350 ms). Tracing shows the cost is the browser's first text layout/font initialisation on this machine (a plain 404 page with the same fonts spends ~430 ms on style/layout), multiplied by Lighthouse's 4× CPU simulation; our own script tasks are ~50 ms. Scores swing by ±10 between identical runs here. The Actions test workflow runs Lighthouse on Linux, which is the better reference. The tool pages score SEO 63 **by design**: they are `noindex`.

Performance work done: content behind the envelope is `content-visibility: hidden` until opened, offscreen sections use `content-visibility: auto`, the countdown ticks only while visible, decorative animations pause behind the envelope, Amiri is subset at build time to the 27 Arabic characters actually used, critical CSS is inlined, JS is a deferred module.

## What the suites cover

**visual.spec.js**, at 375, 768, 1024, 1440 px: envelope + every section screenshotted (`reports/screenshots/<width>/`); no horizontal overflow; no element outside the viewport; no vertical overlap between siblings in any `.wrap`, card, story arch or form; Cormorant, Jost, Pinyon and Amiri actually loaded (no silent fallback / font flash left behind); CLS < 0.05; p95 frame < 50 ms while scrolling; dark mode background is ink-green `#0E1512` (`dark-375-*.png`).

**flows.spec.js**: envelope (seal, Skip, Escape, reduced motion, focus lands on names); generator → invite (honorific, event filter, WhatsApp link, QR painted, live preview, guest sees only the Nikah and the right wording); RSVP (payload shape, text/plain to avoid CORS preflight, sanitised message, validation messages, decline path, server error + rate-limit message, preview mode without endpoint); easter egg by **5 touch taps** (mobile context) and by **Konami code**, not triggered while typing in a field, hype + headcount ride with the RSVP; maps (lazy sandboxed iframe only on tap, Open in Maps with `noopener noreferrer`); calendar (`.ics` download with 19:00 IST = 13:30 UTC, Google Calendar link with `ctz=Asia/Kolkata`); countdown flips; gallery (sepia→colour reveal, lightbox keyboard + swipe); music muted until tapped; admin (edit → preview, invalid URL blocks export, add + reorder story, passphrase hashing, **download content.json** verified); passphrase gate on admin + dashboard; dashboard from mocked sheet stats + table view; theme toggle persists; GA4 off with the placeholder ID, consent bar + `maps_click` event with a real-looking ID.

**security.spec.js**: XSS payloads listed above; CSP present with no `unsafe-inline`/`unsafe-eval`; referrer meta; links check; clean console on `/`, `/create/`, `/admin/`, `/dashboard/`.

**compat.spec.js**: open, render, RSVP and tool pages on Edge, WebKit desktop, WebKit iPhone, Chromium Android (+ Firefox in CI).

Also verified by hand: photo pipeline (two test JPGs → AVIF + WebP at 480/960/1600/full, blur-up data URI, manifest), OG image render (`site/assets/img/og.jpg`, 1200×630, 9 KB), WebKit console during a full open + RSVP (clean).

## Side-by-side with the Ramadan app (`reports/compare/`)

`side-by-side-390.png` and `side-by-side-1440.png` show Ramadan app | invite envelope | invite card. The Ramadan app is a sky-to-sunset gradient hero with a mosque silhouette, lanterns and a crescent, rounded translucent cards and pill chips. The invite has none of those: bottle-green envelope with a dusty-rose seal, sharp double-hairline frames, a mihrab crest and script names. Colour-histogram overlap with the Ramadan screenshot: envelope 0.006–0.024 (essentially none), card 0.58–0.85, which is the shared ivory paper base the brief asked to keep.

## Dataviz check
`validate_palette.js "#0B3D2E,#B89B5E"` fails the categorical lightness/chroma bands (the heirloom palette is deliberately muted). So the dashboard never uses colour for identity: every chart is single-series, with direct value labels, hover/focus tooltips and a table view.

## Skills and substitutions
- Used: **dataviz** (dashboard method + palette validator). Playwright (tests), Lighthouse.
- Not available under the brief's names: `ce-dogfood`, `ce-polish`, `frontend-design`, `design-system`, `ce-test-browser` as a separate step. The equivalent work was done directly: Playwright dogfooding of every flow, screenshot review at four widths with fixes (deckle edges, panel text colours, mobile button grid, credits labels, admin hints, tile numerals), and a manual security pass (grep for `innerHTML`/`eval`/secrets: none).
- The installed review/planning skills (ce-plan, ce-code-review, ponytail-review/audit, ui-ux-pro-max, 21st-ui) were not invoked, to keep the build token-efficient as the brief asked; their checks were covered by the test suites above. Running `/code-review` on the first commit is a sensible next step.

## Known limitations
- Mobile Lighthouse Performance 90–94 here (see above).
- Firefox only tested in CI.
- `frame-ancestors` cannot be set from a meta tag; GitHub Pages cannot add headers.
- Apps Script cannot see IPs, so rate limiting is per name + global per minute.
- RSVPs are not saved until the Apps Script URL is set (`TODO.md`).
