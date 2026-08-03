/**
 * Deck store for the CHEM 242 study site. Deploy as a web app.
 *
 * This file is the security boundary. The site is static files on GitHub Pages,
 * so nothing the browser does can be trusted: anyone can edit the bundle or
 * their own localStorage. Authorisation happens here and only here.
 *
 * doPost  — verifies a Google ID token, checks the allowlist, stores a deck.
 * doGet   — returns published decks as public JSON. No auth; reading is open.
 *
 * SETUP
 * 1. Create a Google Cloud OAuth client ID (type: Web application) and add
 *    your site's origin to "Authorized JavaScript origins".
 * 2. Extensions > Apps Script on a new Google Sheet, paste this in.
 * 3. Project Settings > Script Properties, add:
 *      CLIENT_ID  = <the OAuth client ID>
 *      ALLOWLIST  = andliu@terpmail.umd.edu,zeus.andrewliu@gmail.com
 *    Put the allowlist HERE, not in the repo. It never reaches the browser,
 *    it can be changed without a redeploy, and it keeps a list of admin
 *    addresses out of a public git history.
 * 4. Deploy > New deployment > Web app.
 *      Execute as: Me.   Who has access: Anyone.
 *    "Anyone" is correct: the token check below is the gate, not Google's
 *    page-level one, and page-level auth would break the fetch with a redirect
 *    to accounts.google.com that CORS will not follow.
 * 5. Put the /exec URL in .env.local as VITE_DECKS_ENDPOINT, and the client ID
 *    as VITE_GOOGLE_CLIENT_ID.
 */

var SHEET_NAME = 'decks';

function props_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'email', 'at', 'deckJson']);
  }
  return sh;
}

/**
 * Verifies the token with Google and returns its email, or null.
 *
 * Checking `aud` is not optional. Without it any Google ID token would be
 * accepted, including one minted by a completely unrelated application, which
 * would let anyone with any Google account publish.
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

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var email = verify_(body.idToken);
    if (!email) return json_({ ok: false, error: 'Sign-in could not be verified.' });
    if (!allowed_(email)) return json_({ ok: false, error: 'That account is not authorised.' });

    var deck = body.deck;
    if (!deck || !deck.id || !deck.title || !(deck.questions || []).length) {
      return json_({ ok: false, error: 'Deck was empty or malformed.' });
    }

    // Overwrite in place when the id already exists, so republishing a
    // corrected file updates the deck instead of duplicating it.
    var sh = sheet_();
    var ids = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
    var row = -1;
    for (var i = 1; i < ids.length; i++) {
      if (ids[i][0] === deck.id) row = i + 1;
    }

    var values = [deck.id, email, new Date().toISOString(), JSON.stringify(deck)];
    if (row > 0) sh.getRange(row, 1, 1, 4).setValues([values]);
    else sh.appendRow(values);

    return json_({ ok: true, id: deck.id });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  try {
    var sh = sheet_();
    if (sh.getLastRow() < 2) return json_({ decks: [] });
    var rows = sh.getRange(2, 4, sh.getLastRow() - 1, 1).getValues();
    var decks = rows
      .map(function (r) {
        try {
          return JSON.parse(r[0]);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
    return json_({ decks: decks });
  } catch (err) {
    return json_({ decks: [], error: String(err) });
  }
}
