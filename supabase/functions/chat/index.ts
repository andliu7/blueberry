/**
 * Ask Blueberry, on an Edge Function.
 *
 * This exists because Apps Script could not verify the sign-in. Its `verify_()`
 * only understands Google ID tokens, so a Supabase session had nothing to send
 * it and `useSession` deliberately returned `idToken: null` rather than hand it
 * a credential it would silently fail to check. A genuinely signed-in owner was
 * refused, with no error surfaced.
 *
 * Here the JWT the browser already holds IS the credential, and Supabase
 * verifies it for us before this code runs.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 900;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

interface Turn {
  role: "user" | "assistant";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ ok: false, error: "The assistant is not configured yet." }, 500);

  // The caller's own token, not the service key. Passing it through means RLS
  // and `auth.getUser` see the person who actually asked, so this function
  // cannot be tricked into answering as somebody else.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    // Named distinctly so the client can offer a sign-in rather than printing
    // "that did not work", which is what the old path did.
    return json({ ok: false, error: "not-signed-in" }, 401);
  }

  let messages: Turn[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }
  if (!messages.length) return json({ ok: false, error: "Nothing to answer." }, 400);

  const system = [
    "You are Blueberry, a study helper for University of Maryland CHEM241, organic chemistry II.",
    "Be brief and concrete. Prefer a worked example over a definition.",
    "If you are not certain of a chemical fact, say so plainly rather than guessing.",
    "Never invent reagents, conditions or mechanisms. A wrong answer here is studied and repeated.",
  ].join(" ");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("anthropic failed", res.status, detail.slice(0, 400));
    return json({ ok: false, error: "Blueberry could not answer just now." }, 502);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") return json({ ok: false, error: "Empty answer." }, 502);

  return json({ ok: true, text });
});
