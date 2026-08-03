/**
 * One Apps Script backend for the whole study site.
 *
 * A web app can only export one doPost and one doGet. A second definition does
 * not add an endpoint, it silently replaces the first. So everything is routed
 * through a single entry point on a `type` field instead, and each feature
 * writes to its own tab of the same spreadsheet.
 *
 *   POST { type: "feedback", rating, comment }        -> feedback tab
 *   POST { type: "contact",  firstname, ..., message } -> messages tab, emails you
 *   POST { type: "deck",     idToken, deck }           -> decks tab, allowlist only
 *   GET  ?type=decks                                   -> published decks as JSON
 *
 * A payload with no `type` is treated as feedback, so a browser still running
 * an older cached bundle keeps working after this is deployed.
 *
 * SETUP
 * 1. Paste this into the existing "Grignard" Apps Script project, replacing
 *    what is there.
 * 2. Project Settings > Script Properties:
 *      SHEET_ID   = the spreadsheet id from its URL
 *      NOTIFY_TO  = your email, for contact form notifications
 *      CLIENT_ID  = Google OAuth client id      (only needed for deck upload)
 *      ALLOWLIST  = comma separated emails      (only needed for deck upload)
 *    These live here rather than in the file because this repo is public. The
 *    spreadsheet id is not a credential, but it does tell a reader exactly
 *    which document to go and try.
 * 3. Deploy > Manage deployments > edit the existing one > Version: New version.
 *    Editing the existing deployment keeps the same /exec URL, so the feedback
 *    widget already pointing at it does not break. Creating a *new* deployment
 *    would give you a different URL.
 *    Execute as: Me.   Who has access: Anyone.
 * 4. Run doGet once from the editor to trigger the authorisation prompt.
 */

var TABS = { feedback: 'feedback', contact: 'messages', deck: 'decks' };
var MAX_CONTACT_PER_HOUR = 20;
var MAX_LEN = 5000;

function props_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function book_() {
  var id = props_('SHEET_ID');
  if (!id) throw new Error('Set SHEET_ID in Script Properties.');
  return SpreadsheetApp.openById(id);
}

/** Gets a tab, creating it with headers the first time it is written to. */
function tab_(name, headers) {
  var ss = book_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function clean_(v) {
  return String(v == null ? '' : v).slice(0, MAX_LEN);
}

// ---------------------------------------------------------------- feedback

function handleFeedback_(data) {
  var sh = tab_(TABS.feedback, ['at', 'rating', 'comment']);
  sh.appendRow([data.at || new Date().toISOString(), clean_(data.rating), clean_(data.comment)]);
  return json_({ ok: true });
}

// ----------------------------------------------------------------- contact

/** Crude flood guard: how many rows were written in the last hour. */
function overLimit_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return false;
  var start = Math.max(2, last - MAX_CONTACT_PER_HOUR);
  var stamps = sh.getRange(start, 1, last - start + 1, 1).getValues();
  var cutoff = Date.now() - 60 * 60 * 1000;
  var recent = 0;
  for (var i = 0; i < stamps.length; i++) {
    var t = Date.parse(stamps[i][0]);
    if (!isNaN(t) && t > cutoff) recent++;
  }
  return recent >= MAX_CONTACT_PER_HOUR;
}

function handleContact_(data) {
  var email = clean_(data.email);
  var message = clean_(data.message);
  if (!email || !message) return json_({ ok: false, error: 'Email and message are both required.' });
  if (email.indexOf('@') === -1) return json_({ ok: false, error: 'That email does not look right.' });

  var sh = tab_(TABS.contact, ['at', 'first', 'last', 'email', 'subject', 'message']);
  if (overLimit_(sh)) {
    return json_({ ok: false, error: 'Too many messages just now. Please try again later.' });
  }

  var first = clean_(data.firstname);
  var last = clean_(data.lastname);
  var subject = clean_(data.subject) || '(no subject)';
  sh.appendRow([new Date().toISOString(), first, last, email, subject, message]);

  var to = props_('NOTIFY_TO');
  if (to) {
    MailApp.sendEmail({
      to: to,
      subject: 'Study site: ' + subject,
      // replyTo means hitting reply in your inbox answers the sender rather
      // than yourself.
      replyTo: email,
      body: ['From: ' + first + ' ' + last + ' <' + email + '>', '', message].join('\n'),
    });
  }
  return json_({ ok: true });
}

// -------------------------------------------------------------------- decks

/**
 * Verifies a Google ID token and returns its email, or null.
 *
 * Checking `aud` is not optional. Without it any Google ID token would be
 * accepted, including one minted by a completely unrelated application, which
 * would let anyone with any Google account publish a deck.
 */
function verify_(idToken) {
  if (!idToken) return null;
  var res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) return null;

  var info = JSON.parse(res.getContentText());
  if (info.aud !== props_('CLIENT_ID')) return null;
  if (info.email_verified !== 'true' && info.email_verified !== true) return null;
  if (Number(info.exp) * 1000 < Date.now()) return null;
  return String(info.email || '').toLowerCase();
}

function allowed_(email) {
  var list = props_('ALLOWLIST')
    .split(',')
    .map(function (e) {
      return e.trim().toLowerCase();
    })
    .filter(Boolean);
  return list.indexOf(email) !== -1;
}

function handleDeck_(data) {
  var email = verify_(data.idToken);
  if (!email) return json_({ ok: false, error: 'Sign-in could not be verified.' });
  if (!allowed_(email)) return json_({ ok: false, error: 'That account is not authorised.' });

  var deck = data.deck;
  if (!deck || !deck.id || !deck.title || !(deck.questions || []).length) {
    return json_({ ok: false, error: 'Deck was empty or malformed.' });
  }

  // Overwrite in place when the id already exists, so republishing a corrected
  // file updates the deck instead of duplicating it.
  var sh = tab_(TABS.deck, ['id', 'email', 'at', 'deckJson']);
  var ids = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
  var row = -1;
  for (var i = 1; i < ids.length; i++) {
    if (ids[i][0] === deck.id) row = i + 1;
  }

  var values = [deck.id, email, new Date().toISOString(), JSON.stringify(deck)];
  if (row > 0) sh.getRange(row, 1, 1, 4).setValues([values]);
  else sh.appendRow(values);

  return json_({ ok: true, id: deck.id });
}

// ------------------------------------------------------------------ routing

function doPost(e) {
  // One lock for every write. Two people submitting at the same moment would
  // otherwise both read the same last row and one would overwrite the other.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    switch (data.type) {
      case 'contact':
        return handleContact_(data);
      case 'deck':
        return handleDeck_(data);
      case 'feedback':
      default:
        // No type means an older cached bundle, which only ever sent feedback.
        return handleFeedback_(data);
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var type = (e && e.parameter && e.parameter.type) || '';
    if (type !== 'decks') return json_({ ok: true, note: 'POST to this endpoint.' });

    var sh = tab_(TABS.deck, ['id', 'email', 'at', 'deckJson']);
    if (sh.getLastRow() < 2) return json_({ decks: [] });
    var rows = sh.getRange(2, 4, sh.getLastRow() - 1, 1).getValues();
    var decks = rows
      .map(function (r) {
        try {
          return JSON.parse(r[0]);
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);
    return json_({ decks: decks });
  } catch (err) {
    return json_({ decks: [], error: String(err) });
  }
}
