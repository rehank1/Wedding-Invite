# TODO: missing content

Everything below currently shows an elegant placeholder (or is hidden) on the live invite. Fill it in at **/admin** or in `site/content/content.json`. Field names in `code`.

## Please confirm (I inferred these)
- [ ] Full names `couple.groom.fullName` = "Rehan Kazi" and `couple.bride.fullName` = "Siddiqua Shariff" (guessed from the parents' names).
- [ ] Reception wording: your reception text was cut off ("We request the honour of your gra…"). It currently uses the Nikah closing line for both.
- [ ] Event end times `events[].endTime` = 23:00 (used for calendar entries only).
- [ ] Closing dua `wording.closingDuaArabic` / `closingDuaEnglish` (the traditional "Barakallahu lakuma…" marriage dua). Keep, change, or empty it.
- [ ] Monogram: a new Victorian RS monogram drawn from scratch (crown, beaded oval cartouche, scrolls, interlaced R and S). Approve or ask for changes.

## Couple & wording
- [ ] Hashtag `couple.hashtag`
- [ ] Footer thank-you line `footer.thanks` (placeholder: "Thank you for being part of our story")

## Events
- [ ] Exact Google Maps share links `events[].mapsUrl` (currently a search for "Krishna Lawns, SRPF, Wanowrie, Pune")
- [ ] Notes per event `events[].notes` (parking, entry gate, ladies' seating…), optional

## The tour of the evening
- [ ] Real programme for each celebration (`events[].programme`): currently "Guests arrive 7:00 PM · The Nikah / The couple arrives (after Maghrib) · Dinner"
- [ ] Short duas for the duas chapter (`wording.duaLines`) – three gentle defaults are in place

## On the day
- [ ] Shared photo album link (`dayOf.photoAlbumUrl`), parking (`dayOf.parking`), live note (`dayOf.note`)

## Music (optional)
- [ ] Optional: your own song as `music.src` → `site/content/music/<file>.mp3` (a generated harp-and-strings score plays until then)

## Backend
- [ ] Deploy the Apps Script and set `site.rsvpEndpoint` (until then duas and afterparty sign-ups run in preview mode and are **not saved**)

## After Hours (easter egg)
- [ ] `afterparty.date`, `time`, `venue`, `mapsUrl`, `dressCode`

## Site & analytics
- [ ] Live address `site.url` (needed for the WhatsApp preview image)
- [ ] GA4 Measurement ID `site.ga4` (placeholder `G-XXXXXXX` = analytics off)
- [ ] Looker Studio embed `site.lookerUrl`
- [ ] Admin/dashboard passphrase `site.passHash` (set in /admin → Site → New passphrase)
- [ ] GitHub repository + Pages (not created yet; see README §8) and optional custom domain
