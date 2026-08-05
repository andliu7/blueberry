/**
 * One Apps Script backend for the whole study site.
 *
 *   POST { type: "feedback", rating, comment }          -> feedback tab
 *   POST { type: "contact",  firstname, ..., message }  -> messages tab, emails you
 *   POST { type: "deck",     idToken, deck }            -> decks tab, allowlist only
 *   GET  ?type=decks                                    -> published decks as JSON
 *
 * A web app exports one doPost. A second definition does not add an endpoint,
 * it silently replaces the first, so everything routes through one entry point
 * on a `type` field. No `type` is treated as feedback, so a browser running an
 * older cached bundle keeps working after a redeploy.
 *
 * SETUP
 * 1. Script Properties: SHEET_ID, NOTIFY_TO. CLIENT_ID and ALLOWLIST may go
 *    there too, or be left as the constants below.
 * 2. Run any function once from the editor and accept the consent screen. The
 *    mail permission is only requested at that point, and without it the
 *    contact route fails in a way the browser reports as a network error.
 * 3. Deploy > Manage deployments > edit the existing one > New version. That
 *    keeps the same /exec URL. A new deployment would hand you a different one.
 */

// One OAuth client id covers every site that uses it. Add both origins to it
// in Google Cloud rather than creating a client id per origin:
//   http://localhost:5173
//   https://andliu7.github.io
var CLIENT_ID = '971212739983-b8equevo7r4injk7jhmo2kpchi40cadj.apps.googleusercontent.com';
var ALLOWLIST = 'andliu@terpmail.umd.edu, zeus.andrewliu@gmail.com';

var TABS = { feedback: 'feedback', contact: 'messages', deck: 'decks' };
var MAX_CONTACT_PER_HOUR = 20;
var MAX_LEN = 5000;

/**
 * Script Properties first, then the constants above.
 *
 * The fallback matters: the rest of the file reads CLIENT_ID and ALLOWLIST
 * through this function, so declaring them only as variables at the top would
 * leave every deck upload refused with "Sign-in could not be verified", since
 * the audience check would be comparing against an empty string.
 */
function props_(key) {
  var fromProps = PropertiesService.getScriptProperties().getProperty(key);
  if (fromProps) return fromProps;
  if (key === 'CLIENT_ID') return CLIENT_ID;
  if (key === 'ALLOWLIST') return ALLOWLIST;
  return '';
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

  // The row is saved by this point, so a failed notification must not fail the
  // request. MailApp needs a scope the deployment may not have been granted,
  // and an uncaught throw returns an error page with no CORS headers, which the
  // browser reports to the visitor as a network failure on a message that was
  // in fact received.
  var to = props_('NOTIFY_TO');
  var mailed = false;
  if (to) {
    try {
      MailApp.sendEmail({
        to: to,
        subject: 'Study site: ' + subject,
        // replyTo means hitting reply in your inbox answers the sender rather
        // than yourself.
        replyTo: email,
        body: ['From: ' + first + ' ' + last + ' <' + email + '>', '', message].join('\n'),
      });
      mailed = true;
    } catch (mailErr) {
      // Recorded in the sheet so a missing authorisation is visible rather than
      // silent. Run any function in the editor once to grant the mail scope.
      sh.getRange(sh.getLastRow(), 6).setValue(message + '\n\n[notify failed: ' + mailErr + ']');
    }
  }

  // Every branch must return. Without this the function hands back undefined,
  // doPost returns undefined, and Apps Script sends an empty response the
  // browser cannot parse.
  return json_({ ok: true, mailed: mailed });
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

/**
 * Removes a published deck.
 *
 * Same gate as publishing, and for the same reason: the client is a static
 * bundle anyone can edit, so a delete button that the browser decides to show is
 * not a permission. The token is verified and the email checked against the
 * allowlist here, where neither can be tampered with.
 *
 * Only ever touches the decks tab. There is nothing to delete that was not
 * uploaded, since the built-in decks live in the repository and never appear in
 * this sheet at all.
 */
function handleDeleteDeck_(data) {
  var email = verify_(data.idToken);
  if (!email) return json_({ ok: false, error: 'Sign-in could not be verified.' });
  if (!allowed_(email)) return json_({ ok: false, error: 'That account is not authorised.' });

  var id = data.id;
  if (!id) return json_({ ok: false, error: 'No deck id given.' });

  var sh = tab_(TABS.deck, ['id', 'email', 'at', 'deckJson']);
  var last = sh.getLastRow();
  if (last < 2) return json_({ ok: false, error: 'No published decks.' });

  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  // Backwards: deleting a row shifts everything below it up, so walking forwards
  // would skip the row after each removal.
  var removed = 0;
  for (var i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === id) {
      sh.deleteRow(i + 2);
      removed++;
    }
  }

  if (removed === 0) return json_({ ok: false, error: 'That deck was not found.' });
  return json_({ ok: true, id: id, removed: removed });
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
      case 'deleteDeck':
        return handleDeleteDeck_(data);
      case 'feedback':
      default:
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
