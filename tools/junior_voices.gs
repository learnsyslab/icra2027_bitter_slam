/**
 * Junior voices: receives the website form and appends each submission to a Google Sheet.
 *
 * Setup (once, in the Google account that should own the data):
 *  1. Create a Google Sheet, e.g. "BitterSLAM Junior Voices", and share it with the organizers.
 *  2. In the Sheet: Extensions -> Apps Script. Replace the editor contents with this file and save.
 *  3. Optionally set NOTIFY below to an address that should get an email per submission.
 *  4. Deploy -> New deployment -> type "Web app".
 *     Execute as: Me.  Who has access: Anyone.  Deploy, then authorize the requested access.
 *  5. Copy the web app URL (ends in /exec) into JV_ENDPOINT in assets/junior.js.
 *
 * After editing this script, use Deploy -> Manage deployments -> Edit -> Version: New version,
 * so the /exec URL stays the same.
 */

const SHEET = 'Submissions';
const NOTIFY = '';  // e.g. 'haoming.zhang@tum.de'; leave empty for no emails
const FIELDS = ['name', 'email', 'affiliation', 'career_stage', 'm1_side', 'm1_statement', 'm2_side', 'm2_statement',
                'bio', 'homepage', 'debate_interest', 'publish_consent', 'privacy_consent'];
const HEADER = ['timestamp'].concat(FIELDS, ['selected', 'notes']);
const CHECKBOXES = ['debate_interest', 'publish_consent', 'privacy_consent'];
const MIN_SECONDS = 20;     // nobody writes a statement faster; quicker posts are bots
const MAX_PER_EMAIL = 3;    // further submissions from the same address are refused

function doPost(e) {
  const p = e.parameter || {};
  // Bots: spam trap filled in, or posted without the page / faster than a person could type.
  // Pretend success so they get no signal, but store nothing.
  if (p.website || !(+p.t >= MIN_SECONDS * 1000)) return json({ ok: true });
  const err = invalid(p);
  if (err) return json({ ok: false, error: err });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    // (re)write the header, e.g. after the form fields changed
    const head = sheet.getRange(1, 1, 1, HEADER.length);
    if (head.getValues()[0].join() !== HEADER.join()) head.setValues([HEADER]);
    sheet.setFrozenRows(1);
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
    MailApp.sendEmail(NOTIFY, `[BitterSLAM] Junior voice: ${clean(p.name)} (${['m1', 'm2'].filter(m => p[m + '_side']).map(m => `${m.toUpperCase()} ${p[m + '_side']}`).join(', ')})`,
      FIELDS.map(f => `${f}: ${p[f] || ''}`).join('\n'));
  }
  return json({ ok: true });
}

// Server-side checks, since the endpoint can be called without the website.
function invalid(p) {
  const words = t => (String(t || '').trim().match(/\S+/g) || []).length;
  if (p.privacy_consent !== 'yes' || !p.name || !p.email || !p.affiliation || !p.bio) return 'missing required fields';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) return 'invalid email address';
  let motions = 0;
  for (const m of ['m1', 'm2']) {
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

// Limit length, and stop text starting with = + - @ from being read as a spreadsheet formula.
function clean(v) {
  const s = String(v).slice(0, 5000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
