/**
 * Contact form receiver for the CHEM 242 study site.
 *
 * Appends each message to a Google Sheet and emails you a copy. Deploy as a web
 * app, then put the /exec URL in .env.local as VITE_CONTACT_ENDPOINT.
 *
 * SETUP
 * 1. Create a Google Sheet, then Extensions > Apps Script and paste this in.
 * 2. Project Settings > Script Properties, add:
 *      NOTIFY_TO = andliu@terpmail.umd.edu
 *    Kept in Script Properties rather than hardcoded here so the address is not
 *    committed to a public repo where scrapers will find it.
 * 3. Deploy > New deployment > Web app.
 *      Execute as: Me.   Who has access: Anyone.
 *    "Anyone" is required: visitors are not signed in, and this endpoint only
 *    ever accepts a message. It grants no read access to the sheet.
 * 4. Run doPost once from the editor to trigger the authorisation prompt.
 *
 * ON SPAM: a public POST endpoint will eventually be found by bots. The rate
 * limit below is deliberately crude but stops the obvious flood. If it becomes a
 * real problem, the next step is a hidden honeypot field rather than a CAPTCHA,
 * which is a poor trade for a form this small.
 */

var SHEET_NAME = 'messages';
var MAX_PER_HOUR = 20;
var MAX_LEN = 5000;

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
    sh.appendRow(['at', 'first', 'last', 'email', 'subject', 'message']);
  }
  return sh;
}

/** Crude flood guard: how many rows were written in the last hour. */
function overLimit_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return false;
  var start = Math.max(2, last - MAX_PER_HOUR);
  var stamps = sh.getRange(start, 1, last - start + 1, 1).getValues();
  var cutoff = Date.now() - 60 * 60 * 1000;
  var recent = 0;
  for (var i = 0; i < stamps.length; i++) {
    var t = Date.parse(stamps[i][0]);
    if (!isNaN(t) && t > cutoff) recent++;
  }
  return recent >= MAX_PER_HOUR;
}

function clean_(v) {
  return String(v == null ? '' : v).slice(0, MAX_LEN);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var email = clean_(body.email);
    var message = clean_(body.message);
    if (!email || !message) {
      return json_({ ok: false, error: 'Email and message are both required.' });
    }
    if (email.indexOf('@') === -1) {
      return json_({ ok: false, error: 'That email address does not look right.' });
    }

    var sh = sheet_();
    if (overLimit_(sh)) {
      return json_({ ok: false, error: 'Too many messages just now. Please try again later.' });
    }

    var first = clean_(body.firstname);
    var last = clean_(body.lastname);
    var subject = clean_(body.subject) || '(no subject)';

    sh.appendRow([new Date().toISOString(), first, last, email, subject, message]);

    var to = props_('NOTIFY_TO');
    if (to) {
      MailApp.sendEmail({
        to: to,
        subject: 'Study site: ' + subject,
        // replyTo means hitting reply in your inbox answers the sender rather
        // than yourself.
        replyTo: email,
        body: [
          'From: ' + first + ' ' + last + ' <' + email + '>',
          'Subject: ' + subject,
          '',
          message,
        ].join('\n'),
      });
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Nothing to read here. Kept so a stray GET does not look like an error. */
function doGet() {
  return json_({ ok: true, note: 'POST a message to this endpoint.' });
}
