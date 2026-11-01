/**
 * Website backend (Google Apps Script web app), bound to the organizers' Google Sheet:
 *  - Junior voices: POST from junior.html, one row per submission in the sheet "Submissions".
 *  - Pre-workshop poll: POST votes from index.html into the sheet "Poll"; GET returns the tallies.
 *
 * Setup (once, in the Google account that should own the data):
 *  1. Create a Google Sheet, e.g. "BitterSLAM website", and share it with the organizers.
 *  2. In the Sheet: Extensions -> Apps Script. Replace the editor contents with this file and save.
 *  3. Optionally set NOTIFY below to an address that should get an email per junior-voice submission.
 *  4. Deploy -> New deployment -> type "Web app".
 *     Execute as: Me.  Who has access: Anyone.  Deploy, then authorize the requested access.
 *  5. Copy the web app URL (ends in /exec) into ENDPOINT in assets/site.js.
 *
 * After editing this script, use Deploy -> Manage deployments -> Edit -> Version: New version,
 * so the /exec URL stays the same.
 *
 * Poll moderation: to discard spam votes, delete their rows in "Poll"; the tallies update within a minute.
 * Each browser has a random voter id and only its latest stance per motion counts.
 */

const NOTIFY = '';  // e.g. 'haoming.zhang@tum.de'; leave empty for no emails

// ---------- Junior voices ----------
const SHEET = 'Submissions';
const FIELDS = ['name', 'email', 'affiliation', 'career_stage', 'm1_side', 'm1_statement', 'm2_side', 'm2_statement',
                'bio', 'homepage', 'debate_interest', 'publish_consent', 'privacy_consent'];
const HEADER = ['timestamp'].concat(FIELDS, ['selected', 'notes']);
const CHECKBOXES = ['debate_interest', 'publish_consent', 'privacy_consent'];
const MIN_SECONDS = 20;     // nobody writes a statement faster; quicker posts are bots
const MAX_PER_EMAIL = 3;    // further submissions from the same address are refused

// ---------- Pre-workshop poll ----------
const POLL_OPEN = true;     // set to false to close the poll (results stay visible)
const POLL_SHEET = 'Poll';
const POLL_HEADER = ['timestamp', 'voter', 'motion', 'stance', 'argument'];
const MOTIONS = ['m1', 'm2'];
const STANCES = ['for', 'undecided', 'against'];

function doGet() {
  return json({ ok: true, open: POLL_OPEN, tally: tally() });
}

function doPost(e) {
  const p = e.parameter || {};
  return p.kind === 'poll' ? vote(p) : juniorVoice(p);
}

function juniorVoice(p) {
  // Bots: spam trap filled in, or posted without the page / faster than a person could type.
  // Pretend success so they get no signal, but store nothing.
  if (p.website || !(+p.t >= MIN_SECONDS * 1000)) return json({ ok: true });
  const err = invalid(p);
  if (err) return json({ ok: false, error: err });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheetWithHeader(SHEET, HEADER);
    const emails = sheet.getRange(1, HEADER.indexOf('email') + 1, sheet.getLastRow(), 1).getValues().flat();
    const email = p.email.trim().toLowerCase();
    if (emails.filter(v => String(v).trim().toLowerCase() === email).length >= MAX_PER_EMAIL) {
      return json({ ok: false, error: 'This email address has already been used for several submissions. Please email us to change yours.' });
    }
    const row = FIELDS.map(f => clean(p[f] || (CHECKBOXES.includes(f) ? 'no' : '')));
    sheet.appendRow([new Date()].concat(row));
  } finally {
    lock.releaseLock();
  }

  if (NOTIFY) {
    MailApp.sendEmail(NOTIFY, `[BitterSLAM] Junior voice: ${clean(p.name)} (${MOTIONS.filter(m => p[m + '_side']).map(m => `${m.toUpperCase()} ${p[m + '_side']}`).join(', ')})`,
      FIELDS.map(f => `${f}: ${p[f] || ''}`).join('\n'));
  }
  return json({ ok: true });
}

// Server-side checks, since the endpoint can be called without the website.
function invalid(p) {
  if (p.privacy_consent !== 'yes' || !p.name || !p.email || !p.affiliation || !p.bio) return 'missing required fields';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) return 'invalid email address';
  let motions = 0;
  for (const m of MOTIONS) {
    const side = p[m + '_side'] || '', text = p[m + '_statement'] || '';
    if (!['', 'for', 'against'].includes(side) || !side !== !text.trim()) return 'each motion needs a side and a statement';
    if (side) motions++;
    if (words(text) > 220) return 'statement too long';
  }
  if (!motions) return 'no motion addressed';
  if (words(p.bio) > 80) return 'bio too long';
  if (p.homepage && !/^https?:\/\//.test(p.homepage)) return 'invalid homepage';
  return '';
}

function vote(p) {
  // posted without the page or instantly: store nothing, give no signal
  if (!(+p.t >= 1500)) return json({ ok: true, open: POLL_OPEN, tally: tally() });
  if (!POLL_OPEN) return json({ ok: false, error: 'The pre-workshop poll is closed.' });
  if (!/^[A-Za-z0-9-]{16,40}$/.test(p.voter || '') || !MOTIONS.includes(p.motion) || !STANCES.includes(p.stance)) {
    return json({ ok: false, error: 'invalid vote' });
  }
  const argument = String(p.argument || '').trim();
  if (words(argument) > 80) return json({ ok: false, error: 'Please keep your argument within 60 words.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheetWithHeader(POLL_SHEET, POLL_HEADER).appendRow([new Date(), p.voter, p.motion, p.stance, clean(argument)]);
    CacheService.getScriptCache().remove('tally');
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true, open: POLL_OPEN, tally: tally() });
}

// Counts the latest stance of each voter per motion; cached for a minute so page loads stay cheap.
function tally() {
  const cache = CacheService.getScriptCache(), hit = cache.get('tally');
  if (hit) return JSON.parse(hit);
  const latest = {};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(POLL_SHEET);
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 2, sheet.getLastRow() - 1, 3).getValues()
      .forEach(([voter, motion, stance]) => { latest[voter + '|' + motion] = [motion, stance]; });
  }
  const t = {};
  MOTIONS.forEach(m => { t[m] = {}; STANCES.forEach(s => { t[m][s] = 0; }); });
  Object.values(latest).forEach(([m, s]) => { if (t[m] && s in t[m]) t[m][s]++; });
  cache.put('tally', JSON.stringify(t), 60);
  return t;
}

// ---------- Helpers ----------
function sheetWithHeader(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  // (re)write the header, e.g. after the fields changed
  const head = sheet.getRange(1, 1, 1, header.length);
  if (head.getValues()[0].join() !== header.join()) head.setValues([header]);
  sheet.setFrozenRows(1);
  return sheet;
}

function words(t) {
  return (String(t || '').trim().match(/\S+/g) || []).length;
}

// Limit length, and stop text starting with = + - @ from being read as a spreadsheet formula.
function clean(v) {
  const s = String(v).slice(0, 5000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
