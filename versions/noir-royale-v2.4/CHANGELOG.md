# Changelog

## 2.4.0 · 2026-11-16

### Added
- **Music for the whole invitation**, composed in code (`music.js`, 1.9 KB gzipped, no audio file or licence): a soft string pad under harp-like arpeggios in D major (D · Bm · G · A), a kanun-like melody every few bars and a long hall reverb, about 66 bpm and never repeating exactly. It fades in just after the guest opens the invitation (iPhone Safari: on their next tap), pauses when the tab is hidden, and the ♪ button mutes it (remembered). An MP3 in `music.src` replaces it.

## 2.3.0 · 2026-11-16

### Added
- **Cinematic logo reveal** before the opening screen (~6.8 s, once per session, Skip button, Escape), styled after an "epic golden logo reveal" reference: smoky dark marble with teal and gold light and drifting gold dust → an anamorphic flare and starburst → the Victorian monogram assembles out of gold particles → a thick, extruded 3D gold monogram (raymarched from a texture of the logo, bevel highlights, a moving light sweep) swings from a steep camera angle to face you while gold dust blows off it → it settles with "Rehan & Siddiqua · Nikah · Reception · December 2026" and crossfades into the opening. One plain-WebGL shader, no video or library; `cine.js` is 5.7 KB gzipped.
  - Falls back to an SVG/CSS pour when WebGL is unavailable, the GPU is software/very old, or the first frames run slow; reduced motion shows a still gold logo with a gentle fade.
  - Optional synthesized sound (pour, splash, chime), muted until tapped. Fixed overlay (no layout shift); the invitation loads underneath and background films start after the intro.
- **Dashboard → Send an invite:** name + Both / Nikah only / Reception only → link, copy, WhatsApp.

## 2.2.0 · 2026-11-16

### Changed
- **IV · The Evening is now a Victorian pocket watch** (replaces the swipe slider). Each moment of a celebration sits on the dial at its real clock time as a gold jewel; drag the hand (it springs to the nearest moment with a watch-like overshoot), tap a jewel, or use the arrow keys. A seconds hand sweeps; a tab switches Nikah and Reception; the venue (directions, map, calendar) sits below.
- **III · Seal your dua** (replaces press-and-hold): choose a blessing or write your own, sign it in glittering gold ink with your finger, press the rose wax seal; the letter folds into a gilded keepsake chest whose counter shows every dua sent (from the Sheet when connected). Duas and whether they were signed are saved to the Sheet; the drawing itself stays on the guest's phone.

## 2.1.0 · 2026-11-16

### Changed
- **Liquid gold** behind the couple's names: a rippling molten-gold film slowed to half speed (frame-blended), with separate portrait and landscape cuts so it stays sharp on phones and desktops. Replaces the softer gold-in-water clip.
- **Victorian monogram**, drawn from scratch: a crown over a beaded oval cartouche, C-scroll flourishes, a ribbon and acanthus leaves, with interlaced decorative R and S (Cinzel Decorative, subset to capitals, 4 KB).
- **Easter egg is harder to find:** the trigger moved to the small monogram at the very end and now needs 7 quick taps with no visual hint (the Konami code still works for keyboards).

### Added
- **Pick your poison** on the After Hours card: ❄️ Coke · 🌿 Green · 🍫 Barood · 🌀 LSD · 🍄 Shroom · 🫡 Open to anything and everything ("My body is a temple. The temple is under renovation."). Picks are saved with the sign-up and charted on the dashboard.

## 2.0.0 · 2026-11-14 · Noir Royale: the invite as a guided tour

### Changed
- **New look:** dark onyx stage with maroon and aubergine glows, champagne-gold accents, ivory reading text. Colour roles are fixed: gold = names, key facts and anything pressable; ivory = reading; mist = secondary; rose = the duas moment only.
- **New type:** Cinzel (names, headings), Cormorant italic 500 (accents), Jost 400/500 (body), Amiri (Arabic). Thin script faces removed for legibility.
- **New monogram** drawn from scratch: an ogee arch with interlocked R and S and a fine sprig; also the favicon, app icons and share image.
- **Cinematic video backgrounds** (free Pexels clips, self-hosted, 190–460 KB each): gold-glitter galaxy behind the opening, gold in dark water behind the couple, dark roses behind the duas, a gold-dust beam behind the countdown. Posters show first; videos load near the screen, pause off-screen, and are skipped for reduced motion, Data Saver and 2G.
- **The page is a guided tour of chapters:** I The Couple · II The Invitation · III Your Duas · IV The Evening · V Save the Date · VI With Love, with a chapter rail, a reading-progress line and a "Next" button in the dock.
- **IV The Evening** is a swipeable 3D coverflow of stops built from each celebration: the event card, its programme (time + moment), and the venue with directions, map and calendar.
- **Floating dock:** Directions · Calendar · Next chapter.
- **Time-aware:** "See you on Friday" the week before, a live Today card on the wedding days, a thank-you state afterwards (`?mode=week|day|after` to preview).
- **Offline + installable:** service worker and web app manifest.

### Added
- **III Your Duas:** press and hold to send your blessings; a rose-gold ring fills, gold sparks burst and the count is saved to the Sheet (keyboard: hold Space/Enter).

### Removed (at your request)
- Our Story, Gallery, RSVP and Dress code sections. The After Hours card now has its own "Count me in" sign-up.
- The light theme (dark only).

## 1.1.0 · 2026-11-14 · Royal redesign

Inspired by the intros on zareqia.com templates (ideas only; all art is original and drawn in code).

### Changed
- **Intro:** the envelope is now a royal gatefold: bottle-green velvet doors with embossed jaali, arched gold panels, pearl-beaded seam and gold handles, an ivory cartouche plaque ("Tap to open", crest, guest name, rose wax seal). Tap: the plaque splits in 3D, the doors swing open, champagne silk drapes sweep aside, the card appears (≈1.85s, skippable).
- **Glassmorphism:** frosted glass cards (blur + saturate, champagne hairline, inner double border) for the hero, invitation, events, story arches, dress code, RSVP and controls. This replaces the brief's original "no glass / no blur / sharp corners" rule, at your request.
- **3D:** pointer-driven tilt with a moving light glare on cards (desktop), idle float on phones, 3D lift-in reveals as sections scroll in, layered drop-shadow depth on the crest and names.
- **Floating elements:** drifting gold dust in three parallax depths, bobbing line-art florals and soft gold/rose glows in the hero, a slowly rotating halo ring around the crest.
- **Interactive:** scratch-to-reveal foil card for the date (with a Reveal button for keyboard/screen readers), rose petals on reveal; pill buttons with a sheen sweep; jewel-gloss countdown tiles with gold-gradient digits.
- Hero is now a velvet stage continuing from the doors; ivory sections carry a faint gold jaali so the glass has texture to frost.

## 1.0.0 · 2026-11-14

First complete version of the Heirloom invitation.

### Added
- Invitation page: wax-seal envelope opening (3D flap, card slides out, <2s, skippable, Escape, reduced-motion aware), personalised `?to=` greeting with handwriting reveal, Bismillah in Amiri (rtl), arched story timeline, alternating ivory/bottle-green event panels with lazy sandboxed map, Open in Maps, `.ics` + Google Calendar, gold flip-digit countdown, masonry gallery with sepia-to-colour reveal and swipe/keyboard lightbox, dress-code swatches, RSVP with underline fields, honeypot and rose-petal success, footer.
- `?e=` event filtering so each guest sees only their celebrations.
- Hidden "After Hours" card (5 taps on the crest or Konami code) with hype slider + headcount sent with the RSVP.
- `/create` invite generator: honorific + name + events → link, copy, WhatsApp share, QR (PNG download), live preview.
- `/admin` content editor generated from content.json: every field, add/remove/reorder lists, validation (dates, times, https URLs, hex, paths), sanitising export, Download/Copy JSON, load file, live preview, passphrase hashing.
- `/dashboard`: RSVP totals, guests per celebration, afterparty headcount, average hype + distribution (single-series charts with labels, tooltips and table view), Looker Studio embed.
- Google Apps Script backend: server-side validation, honeypot, formula-injection guard, CacheService rate limit, aggregate-only stats.
- GA4 loaded only after consent; custom events open, personalised open, RSVP, maps click, calendar add, egg unlock.
- Build: critical CSS inlined, CSP hashes stamped, Amiri subset to the Arabic in content.json, AVIF/WebP srcsets + blur-up placeholders, styled OG image.
- Light + ink-green dark theme with toggle; self-hosted subset WOFF2 fonts (Cormorant preloaded).
- Playwright suite (visual at 375/768/1024/1440, flows, XSS, security, cross-browser), Lighthouse script, Ramadan side-by-side comparison, GitHub Actions for Pages deploy and tests.
