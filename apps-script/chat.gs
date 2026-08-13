/**
 * Ask Blueberry — the chat route.
 *
 * PASTE THIS INTO script.google.com, NOT HERE. This file is the tracked copy;
 * the code that runs lives in Google's editor. After pasting:
 *   Deploy -> Manage deployments -> edit -> Version: New version -> Deploy
 * Saving alone does not update the live web app.
 *
 * BEFORE IT WILL WORK: Project Settings -> Script Properties -> add
 *   ANTHROPIC_API_KEY = sk-ant-...
 * Script Properties are server side. The key must never be a VITE_ value: those
 * are inlined into the public bundle at build time, which would publish it.
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
 * Route this from your existing doPost switch:
 *   if (type === 'chat') return handleChat(payload);
 *
 * `payload.messages` is the conversation so far, as [{role, content}].
 */
function handleChat(payload) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, error: 'ANTHROPIC_API_KEY is not set on this script.' };

  /**
   * THE GATE. Uncomment once you point it at this script's existing verifier —
   * the same function the workspace routes already use on `payload.idToken`.
   *
   * Without it this endpoint is open: anyone who finds the URL spends your
   * Anthropic credits. The client sends the token already, but a browser can
   * send anything, so the check has to happen here.
   *
   *   var email = verifyIdToken_(payload && payload.idToken);   // <- your verifier's name
   *   if (!email) return { ok: false, error: 'Sign in to ask Blueberry.' };
   */

  var messages = (payload && payload.messages) || [];
  if (!messages.length) return { ok: false, error: 'No messages.' };

  // Trimmed rather than sent whole: the browser decides what to keep, and an
  // unbounded history is an unbounded bill.
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
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    payload: JSON.stringify(body),
    // Without this a non-200 throws and the caller sees a generic failure
    // instead of the message the API actually sent.
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  var parsed;
  try {
    parsed = JSON.parse(res.getContentText());
  } catch (e) {
    return { ok: false, error: 'The model returned something unreadable.' };
  }

  if (code !== 200) {
    return { ok: false, error: (parsed.error && parsed.error.message) || ('HTTP ' + code) };
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

  return { ok: true, text: text, usage: parsed.usage };
}
