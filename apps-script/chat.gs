/**
 * Ask Blueberry — the chat route.
 *
 * PASTE THIS INTO script.google.com, NOT HERE. This file is the tracked copy;
 * the code that runs lives in Google's editor. After pasting:
 *   Deploy -> Manage deployments -> edit -> Version: New version -> Deploy
 * Saving alone does not update the live web app.
 *
 * Two Script Properties are required (Project Settings -> Script Properties):
 *   ANTHROPIC_API_KEY  sk-ant-...
 *   GOOGLE_CLIENT_ID   the same value as VITE_GOOGLE_CLIENT_ID
 *
 * Both are server side. Neither may be a VITE_ value: those are inlined into
 * the public bundle at build time, which would publish them.
 */

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
 * Who is asking, or null.
 *
 * Self-contained rather than borrowing the workspace verifier, so this route
 * works whatever that one is called. Google's tokeninfo endpoint checks the
 * signature and expiry for us; the `aud` comparison is the part that matters
 * and is easy to leave out — without it any valid Google token from any app in
 * the world would be accepted here.
 */
function chatCaller_(idToken) {
  if (!idToken) return null;
  var clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  if (!clientId) return null;

  var res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true },
  );
  if (res.getResponseCode() !== 200) return null;

  var info;
  try {
    info = JSON.parse(res.getContentText());
  } catch (e) {
    return null;
  }

  if (info.aud !== clientId) return null;
  if (info.email_verified !== 'true' && info.email_verified !== true) return null;
  return info.email || null;
}

/**
 * Route this from your existing doPost switch:
 *   if (type === 'chat') return handleChat(payload);
 */
function handleChat(payload) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, error: 'ANTHROPIC_API_KEY is not set on this script.' };

  // The gate. The client sends a token, but a browser can send anything, so
  // the check happens here. Without it anyone who finds this URL spends the
  // credits.
  var email = chatCaller_(payload && payload.idToken);
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
