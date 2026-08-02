# Sending feedback to a Google Sheet

The feedback widget always keeps a copy in the browser under
`grignard_lcta_feedback_v1`. If `VITE_FEEDBACK_ENDPOINT` is set, it also POSTs
each submission to that URL. With the variable unset, nothing leaves the
browser.

The steps below are yours to run — they need your Google account, so they can't
be done for you.

## 1. Create the sheet

New Google Sheet, first row as headers:

| A | B | C |
|---|---|---|
| timestamp | rating | comment |

## 2. Add the Apps Script

In the sheet: **Extensions → Apps Script**, replace the contents with:

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([data.at || new Date().toISOString(), data.rating || "", data.comment || ""]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

## 3. Deploy it

**Deploy → New deployment → Web app**

- *Execute as*: **Me**
- *Who has access*: **Anyone**

Copy the `/exec` URL it gives you.

## 4. Point the app at it

Create `.env.local` in the project root (it is gitignored):

```
VITE_FEEDBACK_ENDPOINT=https://script.google.com/macros/s/XXXXXXXX/exec
```

Restart `npm run dev`, or rebuild for the deployed site.

## What "secured" does and does not mean here

The **sheet** is private — only you can read it. That part is genuinely secure.

The **endpoint** is not a secret. This is a static site with no server, so the
URL ships inside the JavaScript bundle and anyone who views source can find it
and post to it. "Who has access: Anyone" is what makes the browser POST work at
all; it grants permission to *write*, never to read your sheet.

The realistic risk is junk rows, not exposure. If that ever becomes a problem:

- add a shared token to the request body and have `doPost` drop anything without
  it — this raises the bar but is still readable in the bundle, so it deters
  drive-by posts rather than a determined person
- cap submissions per session, and ignore empty comments
- if you need real authentication, the feedback has to go through a server you
  control, not straight from the browser

Because the POST is fire-and-forget, a failed request is swallowed and the
local copy in `localStorage` remains the backstop.
