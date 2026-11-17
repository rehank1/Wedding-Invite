# content.json, field by field

Everything a guest reads comes from `content.json` in this folder. Edit it in the browser at **/admin** (easiest), or open the file on github.com, press the pencil icon, edit and commit. The site rebuilds itself in about a minute.

Rules of thumb:

- Text is plain text. Anything that looks like HTML (`<b>`, `<script>`) is stripped, on purpose.
- Dates are `YYYY-MM-DD` (e.g. `2026-12-18`). Times are 24-hour `HH:MM` in India time (e.g. `19:00`).
- Links must start with `https://`.
- Photo and music paths are relative to the site, e.g. `content/photos/gallery/01.jpg`.
- Leave a field empty (`""`) and the invite shows a quiet placeholder instead.

## site

| Field | What it does |
|---|---|
| `title` | Short name of the site. |
| `description` | One sentence used by search engines. |
| `url` | Your live address with a trailing slash, e.g. `https://yourname.github.io/wedding-invite/`. Needed so WhatsApp shows the preview image. |
| `ga4` | Google Analytics 4 Measurement ID (`G-…`). Leave `G-XXXXXXX` to switch analytics off completely. |
| `rsvpEndpoint` | The Google Apps Script Web App URL (starts `https://script.google.com/`). It receives the duas guests send and the After Hours sign-ups. Empty = "preview mode" (nothing is saved). |
| `lookerUrl` | Looker Studio embed URL shown on /dashboard (starts `https://lookerstudio.google.com/`). |
| `passHash` | SHA-256 fingerprint of the /admin and /dashboard passphrase. Set it with the "Set passphrase" box in /admin, never by hand. Empty = no passphrase. This keeps casual visitors out; it is **not** real security. |

## couple

| Field | What it does |
|---|---|
| `groom.name`, `bride.name` | Short names shown large in script (e.g. `Rehan`). |
| `groom.fullName`, `bride.fullName` | Full names (kept for your records and future use). |
| `groom.parents`, `bride.parents` | The "Son of… / Daughter of…" line. |
| `monogram` | Initials, e.g. `R & S` (the drawn monogram is the `#mono` symbol at the top of `index.html`). |
| `hashtag` | Optional, shown in the footer, with or without `#`. |

## wording

| Field | What it does |
|---|---|
| `bismillahArabic` | Arabic opening line, set right-to-left in Amiri. |
| `bismillahEnglish` | Its English line underneath. |
| `memorial` | The "In loving memory of… with the warm blessings of…" line. |
| `request` | The invitation sentence. The site adds the occasion(s) at the end automatically, e.g. "…on the auspicious occasion of the Nikah and the wedding reception of their beloved son." |
| `closing` | Closing request line. |
| `closingDuaArabic`, `closingDuaEnglish` | Optional dua with translation. Empty hides it. |
| `compliments` | "With best compliments from…" |
| `duasFrom` | "With love and duas from…" |
| `duaLines` | The ready-made duas guests can choose in "Seal your dua" (they can also write their own). |

## events (a list; add, remove or reorder in /admin)

| Field | What it does |
|---|---|
| `id` | Short lowercase code used in invite links (`nikah`, `walima`). Change it and old links lose that event. If you add a new id, also add it to `ALLOWED_EVENTS` in `apps-script/Code.gs`. |
| `name` | Heading, e.g. `Nikah`, `Reception`. |
| `occasion` | Phrase used in the invitation sentence, e.g. `the Nikah of their beloved son`. |
| `date`, `time`, `endTime` | India time. Used for the countdown, the calendar file and Google Calendar. |
| `timeNote` | How the time reads on the card, e.g. `7:00 PM onwards (after Namaz-e-Maghrib)`. |
| `hijri` | Hijri date as text, e.g. `08th Rajab 1448 Hijri`. |
| `venue`, `address` | Shown on the card and used for the map. |
| `mapsUrl` | Your exact Google Maps link (Share → Copy link). If empty the site searches for venue + address. |
| `notes` | Optional extra line (kept for your records). |
| `programme` | The moments on the pocket watch for this celebration: a list of `{ "time": "7:00 PM", "title": "Guests arrive", "note": "" }`. A clock time places the jewel at that hour; text like "After Maghrib" follows the previous moment. |

## music

`src` – optional, e.g. `content/music/nasheed.mp3` (must be inside this site). Empty = the built-in generated score plays instead. Music fades in after the guest opens the invitation; the ♪ button mutes it.

## dayOf (shown only on the wedding days)

- `photoAlbumUrl` – a shared Google Photos album link guests can add their pictures to.
- `parking` – parking directions for the Today card.
- `note` – any live note for guests (e.g. "Entry from Gate 2").

## afterparty (the secret "After Hours" card)

`name`, `date`, `time` (free text such as `11:00 PM onwards`), `venue`, `mapsUrl`, `dressCode`, `note`. Empty fields show teasing placeholders.

## footer

`thanks` (script line) and `family` (best compliments line in the footer).
