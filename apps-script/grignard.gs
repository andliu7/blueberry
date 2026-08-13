/**
 * Blueberry — the whole Apps Script backend.
 *
 * PASTE THIS INTO script.google.com. This file is the tracked copy; the code
 * that runs lives in Google's editor. After pasting:
 *   Deploy -> Manage deployments -> edit -> Version: New version -> Deploy
 * Saving alone does not update the live web app.
 *
 * Script Properties used:
 *   SHEET_ID           the spreadsheet this writes to
 *   CLIENT_ID          the Google OAuth client id (same as VITE_GOOGLE_CLIENT_ID)
 *   ALLOWLIST          comma separated owner emails
 *   NOTIFY_TO          where contact messages are emailed (optional)
 *   ANTHROPIC_API_KEY  sk-ant-... for Ask Blueberry
 *
 * ANTHROPIC_API_KEY must never be a VITE_ value: those are inlined into the
 * public bundle at build time, which would publish the key.
 */

var TABS = {
  feedback: 'feedback',
  contact: 'messages',
  deck: 'decks',
  shelf: 'shelves',
  todo: 'todos',
  admin: 'admins',
  fbState: 'feedbackState',
};
var MAX_CONTACT_PER_HOUR = 20;
var MAX_LEN = 5000;

/**
 * Script Properties first, then the constants above.
 *
 * The fallback matters: the rest of the file reads CLIENT_ID and ALLOWLIST
 * through this function, so declaring them only as variables at the top would
 * leave every deck upload refused with "Sign-in could not be verified", since
 * the audience check would be comparing against an empty string.
 *
 * `typeof` guards the fallback. Referencing a bare undeclared identifier is a
 * ReferenceError, so without this a missing Script Property took the whole
 * request down instead of failing the one check that needed the value.
 */
function props_(key) {
  var fromProps = PropertiesService.getScriptProperties().getProperty(key);
  if (fromProps) return fromProps;
  if (key === 'CLIENT_ID') return typeof CLIENT_ID !== 'undefined' ? CLIENT_ID : '';
  if (key === 'ALLOWLIST') return typeof ALLOWLIST !== 'undefined' ? ALLOWLIST : '';
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

// ------------------------------------------------------------ ask blueberry

var CLAUDE_MODEL = 'claude-opus-5';
var CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

/** What Blueberry is, and what it must not do. */
var CHAT_SYSTEM = [
  'You are Blueberry, a study assistant for University of Maryland organic chemistry.',
  'Explain mechanisms, reagents and why a step happens. Prefer the reasoning over the answer.',
  'If you are not sure, say so plainly rather than inventing a mechanism.',
  'You are not the course staff and cannot speak for the syllabus, deadlines or grades.',
  'Keep answers short unless asked to go deeper.',
].join(' ');

/**
 * Ask Blueberry.
 *
 * Gated on `verify_`, not `staff_`: students are the point, so any verified
 * Google account may ask. Swap in `staff_` to restrict it while testing.
 *
 * Returns a plain object; `handleChat` wraps it. Every other route returns
 * `json_(...)` directly, and a bare object handed back from doPost is not a
 * ContentService output, so the browser gets nothing it can parse.
 */
function chat_(payload) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, error: 'ANTHROPIC_API_KEY is not set on this script.' };

  // The gate. The client sends a token, but a browser can send anything, so the
  // check happens here. Without it anyone who finds this URL spends the credits.
  var email = verify_(payload && payload.idToken);
  if (!email) return { ok: false, error: 'Sign in to ask Blueberry.' };

  var messages = (payload && payload.messages) || [];
  if (!messages.length) return { ok: false, error: 'No messages.' };

  // Trimmed rather than sent whole: an unbounded history is an unbounded bill.
  messages = messages.slice(-20);

  var body = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: CHAT_SYSTEM,
    // Effort is the cost lever. Thinking is on by default on this model, and
    // max_tokens caps thinking plus reply together, so low effort keeps the
    // budget on the answer for what are mostly short questions.
    output_config: { effort: 'low' },
    messages: messages,
  };

  var res = UrlFetchApp.fetch(CLAUDE_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(body),
    // Without this a non-200 throws and the caller sees a generic failure
    // instead of the message the API actually sent.
    muteHttpExceptions: true,
  });

  var parsed;
  try {
    parsed = JSON.parse(res.getContentText());
  } catch (e) {
    return { ok: false, error: 'The model returned something unreadable.' };
  }

  if (res.getResponseCode() !== 200) {
    return { ok: false, error: (parsed.error && parsed.error.message) || 'Request failed.' };
  }

  // Safety classifiers can decline with a normal 200 and no content, so check
  // stop_reason before reading content — indexing content[0] would throw here.
  if (parsed.stop_reason === 'refusal') {
    return { ok: false, error: 'Blueberry declined that one.' };
  }

  var text = '';
  for (var i = 0; i < parsed.content.length; i++) {
    if (parsed.content[i].type === 'text') text += parsed.content[i].text;
  }

  return { ok: true, text: text };
}

function handleChat_(data) {
  return json_(chat_(data));
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

/**
 * The permanent owners, from Script Properties or the constant at the top.
 *
 * These cannot be removed through the workspace, and that is the whole safety
 * story for admin management. Everything else about who may sign in is editable
 * from a web page by anyone who is already signed in, so without a floor there
 * is a sequence of ordinary clicks that removes the last admin and locks the
 * project out of its own backend, recoverable only by editing the script.
 */
function owners_() {
  return props_('ALLOWLIST')
    .split(',')
    .map(function (e) {
      return e.trim().toLowerCase();
    })
    .filter(Boolean);
}

function adminTab_() {
  return tab_(TABS.admin, ['email', 'addedBy', 'at']);
}

/** Invited admins, from the sheet. Owners are not in here. */
function invited_() {
  var sh = adminTab_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh
    .getRange(2, 1, last - 1, 1)
    .getValues()
    .map(function (r) {
      return String(r[0] == null ? '' : r[0]).trim().toLowerCase();
    })
    .filter(Boolean);
}

function allowed_(email) {
  if (!email) return false;
  var who = String(email).toLowerCase();
  return owners_().indexOf(who) !== -1 || invited_().indexOf(who) !== -1;
}

/** Verifies and authorises in one step, since every writer below needs both. */
function staff_(data) {
  var email = verify_(data.idToken);
  if (!email) return { error: 'Sign-in could not be verified.' };
  if (!allowed_(email)) return { error: 'That account is not authorised.' };
  return { email: email };
}

// -------------------------------------------------------------------- admins

function handleListAdmins_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var sh = adminTab_();
  var last = sh.getLastRow();
  var rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, 3).getValues();
  return json_({
    ok: true,
    you: who.email,
    owners: owners_(),
    admins: rows
      .filter(function (r) {
        return String(r[0] || '').trim() !== '';
      })
      .map(function (r) {
        return {
          email: String(r[0]).trim().toLowerCase(),
          addedBy: String(r[1] || ''),
          at: String(r[2] || ''),
        };
      }),
  });
}

function handleAddAdmin_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var email = clean_(data.email).trim().toLowerCase();
  if (!email) return json_({ ok: false, error: 'An email is required.' });
  // Deliberately loose. The real check is that Google will only ever hand us a
  // token for an address it has verified, so a typo here fails at sign-in
  // rather than letting anyone in.
  if (email.indexOf('@') < 1 || email.indexOf('.') === -1 || email.length > 254) {
    return json_({ ok: false, error: 'That does not look like an email address.' });
  }
  if (allowed_(email)) return json_({ ok: false, error: 'That account already has access.' });

  adminTab_().appendRow([email, who.email, new Date().toISOString()]);
  return json_({ ok: true, email: email });
}

function handleRemoveAdmin_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var email = clean_(data.email).trim().toLowerCase();
  if (!email) return json_({ ok: false, error: 'No account given.' });

  // An owner is a floor, not a row, so there is nothing here to delete and
  // saying so is better than reporting a successful no-op.
  if (owners_().indexOf(email) !== -1) {
    return json_({ ok: false, error: 'Owners cannot be removed from the workspace.' });
  }
  // Removing yourself works, but only while an owner remains, so the click that
  // ends your own access can never be the click that ends everyone's.
  if (email === who.email && owners_().length === 0) {
    return json_({ ok: false, error: 'You are the last admin. Add another before removing yourself.' });
  }

  var sh = adminTab_();
  var last = sh.getLastRow();
  if (last < 2) return json_({ ok: false, error: 'That account was not found.' });

  var rows = sh.getRange(2, 1, last - 1, 1).getValues();
  // Backwards: deleting a row shifts everything below it up.
  var removed = 0;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][0]).trim().toLowerCase() === email) {
      sh.deleteRow(i + 2);
      removed++;
    }
  }
  if (removed === 0) return json_({ ok: false, error: 'That account was not found.' });
  return json_({ ok: true, email: email });
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

// ------------------------------------------------------------------ shelves

/**
 * Sub-folders inside Uploaded.
 *
 * Held in their own tab rather than derived from the decks that reference them,
 * because a folder you have just made and not filled yet still has to survive a
 * reload. Deriving the list from deck rows would make an empty folder
 * indistinguishable from one that never existed.
 *
 * A shelf is just a name. Decks point at it by that name, which means renaming
 * is not supported and that is deliberate: it would have to rewrite every deck
 * that referenced the old name, and the whole feature is worth less than the bug
 * that would eventually come out of a half-finished rename.
 */
function shelfTab_() {
  return tab_(TABS.shelf, ['name', 'email', 'at']);
}

function listShelves_() {
  var sh = shelfTab_();
  if (sh.getLastRow() < 2) return [];
  return sh
    .getRange(2, 1, sh.getLastRow() - 1, 1)
    .getValues()
    .map(function (r) {
      return String(r[0] == null ? '' : r[0]).trim();
    })
    .filter(Boolean);
}

function handleAddShelf_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var name = clean_(data.name).trim();
  if (!name) return json_({ ok: false, error: 'A folder needs a name.' });
  if (name.length > 60) return json_({ ok: false, error: 'That name is too long.' });

  // Case-insensitive, because two folders differing only in capitals are two
  // folders a person cannot tell apart.
  var existing = listShelves_();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].toLowerCase() === name.toLowerCase()) {
      return json_({ ok: false, error: 'There is already a folder called that.' });
    }
  }

  shelfTab_().appendRow([name, who.email, new Date().toISOString()]);
  return json_({ ok: true, name: name });
}

/**
 * Removes a folder. The decks inside it are kept and become loose.
 *
 * Deleting the decks along with it would be the more obvious implementation and
 * the wrong one: someone tidying their folders would lose the uploads, and there
 * is no undo and no copy on the server of the .txt they came from.
 */
function handleDeleteShelf_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var name = clean_(data.name).trim();
  if (!name) return json_({ ok: false, error: 'No folder name given.' });

  var sh = shelfTab_();
  var last = sh.getLastRow();
  var removed = 0;
  if (last >= 2) {
    var names = sh.getRange(2, 1, last - 1, 1).getValues();
    // Backwards: deleting a row shifts everything below it up.
    for (var i = names.length - 1; i >= 0; i--) {
      if (String(names[i][0]).trim().toLowerCase() === name.toLowerCase()) {
        sh.deleteRow(i + 2);
        removed++;
      }
    }
  }
  if (removed === 0) return json_({ ok: false, error: 'That folder was not found.' });

  // Any deck still pointing at it would be filed under a folder that no longer
  // exists, which is how a deck goes missing from every view at once.
  var freed = clearShelfFromDecks_(name);
  return json_({ ok: true, name: name, freed: freed });
}

function clearShelfFromDecks_(name) {
  var sh = tab_(TABS.deck, ['id', 'email', 'at', 'deckJson']);
  var last = sh.getLastRow();
  if (last < 2) return 0;

  var rows = sh.getRange(2, 4, last - 1, 1).getValues();
  var freed = 0;
  for (var i = 0; i < rows.length; i++) {
    try {
      var deck = JSON.parse(rows[i][0]);
      if (deck && deck.shelf && String(deck.shelf).toLowerCase() === name.toLowerCase()) {
        delete deck.shelf;
        sh.getRange(i + 2, 4).setValue(JSON.stringify(deck));
        freed++;
      }
    } catch (err) {
      // A row that will not parse is already invisible to the client, so there
      // is nothing here to repair.
    }
  }
  return freed;
}

/** Files a deck under a shelf, or takes it out of one when `shelf` is empty. */
function handleSetDeckShelf_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var id = clean_(data.id);
  if (!id) return json_({ ok: false, error: 'No deck id given.' });
  var shelf = clean_(data.shelf).trim();

  if (shelf) {
    var known = listShelves_();
    var match = '';
    for (var i = 0; i < known.length; i++) {
      if (known[i].toLowerCase() === shelf.toLowerCase()) match = known[i];
    }
    // Filing into a folder that does not exist would hide the deck, so the name
    // has to be one of ours, spelled the way we spell it.
    if (!match) return json_({ ok: false, error: 'There is no folder called that.' });
    shelf = match;
  }

  var sh = tab_(TABS.deck, ['id', 'email', 'at', 'deckJson']);
  var last = sh.getLastRow();
  if (last < 2) return json_({ ok: false, error: 'That deck was not found.' });

  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var j = 0; j < ids.length; j++) {
    if (ids[j][0] !== id) continue;
    try {
      var deck = JSON.parse(sh.getRange(j + 2, 4).getValue());
      if (shelf) deck.shelf = shelf;
      else delete deck.shelf;
      sh.getRange(j + 2, 4).setValue(JSON.stringify(deck));
      return json_({ ok: true, id: id, shelf: shelf });
    } catch (err) {
      return json_({ ok: false, error: 'That deck could not be read.' });
    }
  }
  return json_({ ok: false, error: 'That deck was not found.' });
}

// ---------------------------------------------------------------- workspace

/**
 * The staff workspace: the feedback that has come in, and the todo board.
 *
 * Read over POST rather than GET, unlike the decks. A GET would have to carry
 * the ID token in the query string, which puts a credential in browser history,
 * in any proxy log along the way, and in the Referer header of anything the page
 * loads afterwards. The deck list is public and needs no token; this is not.
 *
 * Columns are free text rather than an enum. The board is one person's todo
 * list, and a schema that has to be redeployed to rename a column is worse than
 * a string.
 */
var TODO_COLUMNS = ['idea', 'todo', 'doing', 'done'];

function todoTab_() {
  return tab_(TABS.todo, ['id', 'title', 'column', 'note', 'email', 'at']);
}

function readTodos_() {
  var sh = todoTab_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh
    .getRange(2, 1, last - 1, 6)
    .getValues()
    .filter(function (r) {
      return String(r[0] || '').trim() !== '';
    })
    .map(function (r) {
      return {
        id: String(r[0]),
        title: String(r[1] || ''),
        column: String(r[2] || 'todo'),
        note: String(r[3] || ''),
        email: String(r[4] || ''),
        at: String(r[5] || ''),
      };
    });
}

function readFeedback_() {
  var sh = tab_(TABS.feedback, ['at', 'rating', 'comment']);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, 3).getValues();
  var out = [];
  // Newest first, and capped. The whole point is a notification list, and
  // nobody scrolls to the two hundredth item.
  for (var i = rows.length - 1; i >= 0 && out.length < 100; i--) {
    var comment = String(rows[i][2] == null ? '' : rows[i][2]).trim();
    var rating = String(rows[i][1] == null ? '' : rows[i][1]).trim();
    if (!comment && !rating) continue;
    out.push({
      // The row number is a stable id for "have I read this", which is why the
      // feedback tab does not need an id column adding to it.
      id: 'fb-' + (i + 2),
      at: String(rows[i][0] || ''),
      rating: rating,
      comment: comment,
    });
  }
  return out;
}

/**
 * What has been done with each piece of feedback, shared by every admin.
 *
 * In its own tab rather than as columns on `feedback`, because that tab is
 * written by the public widget on every study page and this one is written only
 * by staff. Keeping them apart means a burst of feedback arriving cannot
 * collide with someone triaging, and the feedback tab keeps the shape the
 * widget has always appended to.
 *
 * Keyed by the feedback row id. That is why `readFeedback_` derives ids from the
 * row number and never renumbers them: the id has to survive between the moment
 * one person marks something resolved and the moment another loads the page.
 */
var FB_STATES = ['new', 'resolved', 'idea', 'todo'];

function fbStateTab_() {
  return tab_(TABS.fbState, ['id', 'state', 'by', 'at']);
}

function readFeedbackState_() {
  var sh = fbStateTab_();
  var last = sh.getLastRow();
  if (last < 2) return {};
  var rows = sh.getRange(2, 1, last - 1, 4).getValues();
  var out = {};
  // Later rows win, so a re-triage does not need the old row deleting first.
  for (var i = 0; i < rows.length; i++) {
    var id = String(rows[i][0] || '').trim();
    if (!id) continue;
    out[id] = { state: String(rows[i][1] || 'new'), by: String(rows[i][2] || ''), at: String(rows[i][3] || '') };
  }
  return out;
}

function writeFeedbackState_(id, state, email) {
  var sh = fbStateTab_();
  var last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) {
        sh.getRange(i + 2, 1, 1, 4).setValues([[id, state, email, new Date().toISOString()]]);
        return;
      }
    }
  }
  sh.appendRow([id, state, email, new Date().toISOString()]);
}

function handleSetFeedbackState_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var id = clean_(data.id);
  var state = clean_(data.state).trim();
  if (!id) return json_({ ok: false, error: 'No feedback id given.' });
  if (FB_STATES.indexOf(state) === -1) {
    return json_({ ok: false, error: 'Unknown state: ' + state });
  }
  writeFeedbackState_(id, state, who.email);
  return json_({ ok: true, id: id, state: state });
}

/**
 * Turns a piece of feedback into a task and records that it was promoted.
 *
 * One route rather than the client calling addTodo and then setFeedbackState,
 * because two calls can half-succeed: the task appears and the note still looks
 * untriaged, so the next person promotes it again and you get duplicates.
 */
function handlePromoteFeedback_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var id = clean_(data.id);
  var title = clean_(data.title).trim();
  if (!id || !title) return json_({ ok: false, error: 'Feedback id and a title are both needed.' });

  var column = clean_(data.column).trim();
  if (TODO_COLUMNS.indexOf(column) === -1) column = 'idea';

  var todoId = Utilities.getUuid();
  todoTab_().appendRow([
    todoId,
    title,
    column,
    'From feedback ' + id,
    who.email,
    new Date().toISOString(),
  ]);
  writeFeedbackState_(id, column === 'idea' ? 'idea' : 'todo', who.email);
  return json_({ ok: true, id: id, todoId: todoId, column: column });
}

function handleWorkspace_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });
  // Admins ride along, so opening the workspace is one request rather than two
  // that can disagree with each other while the second is in flight.
  var sh = adminTab_();
  var last = sh.getLastRow();
  var rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, 3).getValues();
  return json_({
    ok: true,
    email: who.email,
    feedback: readFeedback_(),
    feedbackState: readFeedbackState_(),
    todos: readTodos_(),
    owners: owners_(),
    admins: rows
      .filter(function (r) {
        return String(r[0] || '').trim() !== '';
      })
      .map(function (r) {
        return {
          email: String(r[0]).trim().toLowerCase(),
          addedBy: String(r[1] || ''),
          at: String(r[2] || ''),
        };
      }),
  });
}

function handleAddTodo_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var title = clean_(data.title).trim();
  if (!title) return json_({ ok: false, error: 'A task needs a title.' });

  var column = clean_(data.column).trim() || 'idea';
  if (TODO_COLUMNS.indexOf(column) === -1) column = 'idea';

  // Utilities.getUuid rather than a counter: two people adding at the same
  // moment through the lock would otherwise be handed the same next number.
  var id = Utilities.getUuid();
  todoTab_().appendRow([
    id,
    title,
    column,
    clean_(data.note),
    who.email,
    new Date().toISOString(),
  ]);
  return json_({ ok: true, id: id });
}

/** Moves a task between columns, or edits its title or note. */
function handleUpdateTodo_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var id = clean_(data.id);
  if (!id) return json_({ ok: false, error: 'No task id given.' });

  var sh = todoTab_();
  var last = sh.getLastRow();
  if (last < 2) return json_({ ok: false, error: 'That task was not found.' });

  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) !== id) continue;
    var row = i + 2;
    if (data.title != null) sh.getRange(row, 2).setValue(clean_(data.title));
    if (data.column != null) {
      var col = clean_(data.column).trim();
      if (TODO_COLUMNS.indexOf(col) === -1) {
        return json_({ ok: false, error: 'Unknown column: ' + col });
      }
      sh.getRange(row, 3).setValue(col);
    }
    if (data.note != null) sh.getRange(row, 4).setValue(clean_(data.note));
    return json_({ ok: true, id: id });
  }
  return json_({ ok: false, error: 'That task was not found.' });
}

function handleDeleteTodo_(data) {
  var who = staff_(data);
  if (who.error) return json_({ ok: false, error: who.error });

  var id = clean_(data.id);
  if (!id) return json_({ ok: false, error: 'No task id given.' });

  var sh = todoTab_();
  var last = sh.getLastRow();
  if (last < 2) return json_({ ok: false, error: 'That task was not found.' });

  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  // Backwards: deleting a row shifts everything below it up.
  var removed = 0;
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === id) {
      sh.deleteRow(i + 2);
      removed++;
    }
  }
  if (removed === 0) return json_({ ok: false, error: 'That task was not found.' });
  return json_({ ok: true, id: id });
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
      // Inside the switch, after `data` exists. A copy of this sitting above
      // the try block read two identifiers that had not been assigned yet, so
      // every POST threw a ReferenceError before reaching the parse — and,
      // being outside the try, took feedback, contact, decks and the workspace
      // down with it while never releasing the lock.
      case 'chat':
        return handleChat_(data);
      case 'contact':
        return handleContact_(data);
      case 'deck':
        return handleDeck_(data);
      case 'deleteDeck':
        return handleDeleteDeck_(data);
      case 'addShelf':
        return handleAddShelf_(data);
      case 'deleteShelf':
        return handleDeleteShelf_(data);
      case 'setDeckShelf':
        return handleSetDeckShelf_(data);
      case 'workspace':
        return handleWorkspace_(data);
      case 'addTodo':
        return handleAddTodo_(data);
      case 'updateTodo':
        return handleUpdateTodo_(data);
      case 'deleteTodo':
        return handleDeleteTodo_(data);
      case 'listAdmins':
        return handleListAdmins_(data);
      case 'addAdmin':
        return handleAddAdmin_(data);
      case 'removeAdmin':
        return handleRemoveAdmin_(data);
      case 'setFeedbackState':
        return handleSetFeedbackState_(data);
      case 'promoteFeedback':
        return handlePromoteFeedback_(data);
      case 'feedback':
        return handleFeedback_(data);
      default:
        /**
         * A missing `type` is feedback, because that is what the widget sent
         * before any of the other routes existed and an older cached bundle
         * should keep working.
         *
         * A `type` that is present but unrecognised is not. It used to land
         * here too, which meant a route the deployment did not have yet wrote a
         * blank row to the feedback tab and answered `{"ok":true}`. The caller
         * was told its delete had succeeded while nothing had been deleted.
         * Measured: a `deleteDeck` POST against a deployment predating that
         * route returned ok and added a feedback row.
         */
        if (data.type == null || data.type === '') return handleFeedback_(data);
        return json_({ ok: false, error: 'Unknown request type: ' + clean_(data.type) });
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

    // Shelves ride along with the decks rather than getting their own request.
    // The client needs both to draw one page, and an empty folder only exists in
    // this list, so fetching them separately would mean the page could render
    // with decks filed under folders it had not heard of yet.
    var shelves = listShelves_();

    var sh = tab_(TABS.deck, ['id', 'email', 'at', 'deckJson']);
    if (sh.getLastRow() < 2) return json_({ decks: [], shelves: shelves });
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
    return json_({ decks: decks, shelves: shelves });
  } catch (err) {
    return json_({ decks: [], shelves: [], error: String(err) });
  }
}

/** Run once in the editor to grant the sheet and mail scopes. */
function triggerAuth() {
  SpreadsheetApp.getActiveSpreadsheet();
  MailApp.getRemainingDailyQuota();
}
