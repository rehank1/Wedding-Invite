/**
 * Backend for the wedding invite (Google Apps Script bound to a Google Sheet).
 * Deploy as Web app: Execute as Me · Who has access: Anyone.
 *
 * The site POSTs JSON (Content-Type text/plain, so no CORS preflight):
 *   { kind: 'dua', invitee }                                   → one row in "Duas"
 *   { kind: 'afterparty', name, hype, headcount, invitee }     → one row in "Afterparty"
 * The dashboard GETs ?action=stats and receives totals only (no names).
 * Nothing secret lives in the website; nothing here needs a key.
 */
var PICKS = ['coke', 'green', 'barood', 'lsd', 'shroom', 'anything'];
var SHEETS = {
  dua: { name: 'Duas', headers: ['Timestamp', 'Invite link name', 'Dua', 'Signed in gold'] },
  afterparty: { name: 'Afterparty', headers: ['Timestamp', 'Name', 'Hype (1-10)', 'Headcount', 'Invite link name', 'Picks'] },
};

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.website) return json({ ok: true }); // honeypot: bots fill hidden fields; pretend success
    var kind = b.kind === 'afterparty' ? 'afterparty' : b.kind === 'dua' ? 'dua' : null;
    if (!kind) return json({ ok: false, error: 'bad_kind' });

    var row;
    if (kind === 'dua') {
      row = [new Date(), clean(b.invitee, 60), clean(b.dua, 200), b.signed ? 'yes' : ''];
    } else {
      var name = clean(b.name, 60);
      if (name.replace(/^'/, '').length < 2) return json({ ok: false, error: 'name_required' });
      var hype = int(b.hype, 1, 10), head = int(b.headcount, 0, 10);
      if (hype === null || head === null) return json({ ok: false, error: 'bad_numbers' });
      var picks = (Array.isArray(b.picks) ? b.picks : []).map(String).filter(function (p, i, a) { return PICKS.indexOf(p) > -1 && a.indexOf(p) === i; });
      row = [new Date(), name, hype, head, clean(b.invitee, 60), picks.join(', ')];
    }

    // Apps Script cannot see IP addresses: throttle per sender key and globally per minute.
    var cache = CacheService.getScriptCache();
    var who = kind + ':' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(row[1] || 'anon').toLowerCase())).slice(0, 40);
    var mine = Number(cache.get(who) || 0);
    var minuteKey = 'm:' + Math.floor(Date.now() / 60000);
    var minute = Number(cache.get(minuteKey) || 0);
    var limit = kind === 'dua' ? 20 : 5;
    if (mine >= limit || minute >= 120) return json({ ok: false, error: 'rate_limited' });
    cache.put(who, String(mine + 1), 6 * 3600);
    cache.put(minuteKey, String(minute + 1), 120);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { sheet(kind).appendRow(row); } finally { lock.releaseLock(); }
    cache.remove('stats');
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: 'server_error' });
  }
}

function doGet(e) {
  if (!(e && e.parameter && e.parameter.action === 'stats')) return json({ ok: true, service: 'wedding-invite' });
  var cache = CacheService.getScriptCache();
  var hit = cache.get('stats');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  var duas = Math.max(0, sheet('dua').getLastRow() - 1);
  var rows = sheet('afterparty').getDataRange().getValues().slice(1);
  var out = { ok: true, updated: new Date().toISOString(), duas: duas,
    afterparty: { responses: rows.length, headcount: 0, hypeAvg: 0, hypeDist: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], picks: {} } };
  PICKS.forEach(function (p) { out.afterparty.picks[p] = 0; });
  var sum = 0;
  rows.forEach(function (r) {
    var h = Number(r[2]) || 0;
    out.afterparty.headcount += Number(r[3]) || 0;
    sum += h;
    if (h >= 1 && h <= 10) out.afterparty.hypeDist[h - 1]++;
    String(r[5] || '').split(',').map(function (s) { return s.trim(); }).forEach(function (p) { if (p in out.afterparty.picks) out.afterparty.picks[p]++; });
  });
  out.afterparty.hypeAvg = rows.length ? Math.round((sum / rows.length) * 10) / 10 : 0;
  var text = JSON.stringify(out);
  cache.put('stats', text, 60);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function clean(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s; // stop spreadsheet formula injection
}
function int(v, lo, hi) { var n = parseInt(v, 10); return isNaN(n) ? null : Math.min(hi, Math.max(lo, n)); }
function sheet(kind) {
  var cfg = SHEETS[kind];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(cfg.name) || ss.insertSheet(cfg.name);
  if (sh.getLastRow() === 0) { sh.appendRow(cfg.headers); sh.setFrozenRows(1); }
  return sh;
}
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
