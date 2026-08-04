import { useRef, useState } from "react";
import { Upload, CheckCircle2, AlertTriangle, LogOut } from "lucide-react";
import { AdmitOneTicket } from "@/components/ui/admit-one-ticket";
import { QuestionCard } from "@/components/QuestionCard";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { parseDeckText, type ParseResult } from "@/lib/parseDeckText";
import { endpointFor, postToAppsScript } from "@/lib/appsScript";
import { cn } from "@/lib/utils";


/**
 * The ticket at the foot of every deck: admission to adding a new one.
 *
 * Signed-out visitors see the ticket and can tell there is something behind it,
 * which is the point of a ticket. The form only appears once Google has signed
 * someone in, and publishing is only ever accepted or refused by the server.
 * Nothing here decides who is allowed in; the allowlist lives in Apps Script.
 */
export function DeckUploadTicket() {
  const { configured, ready, user, error, signIn, signOut, renderButton } = useGoogleAuth();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [serverMessage, setServerMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setFileName(file.name);
    setStatus("idle");
    setServerMessage("");
    setResult(parseDeckText(await file.text()));
  };

  const publish = async () => {
    if (!result?.deck || !user) return;
    if (!endpointFor("deck")) {
      setStatus("failed");
      setServerMessage("No deck endpoint is configured, so there is nowhere to publish to yet.");
      return;
    }
    setStatus("sending");
    const body = await postToAppsScript("deck", { idToken: user.idToken, deck: result.deck });
    if (body.ok) {
      setStatus("done");
      setServerMessage("Published. It will appear on the hub for everyone.");
    } else {
      setStatus("failed");
      setServerMessage(
        body.error === "unreachable"
          ? "Could not reach the deck endpoint."
          : (body.error ?? "The server refused the upload."),
      );
    }
  };

  return (
    <section className="mt-16 flex flex-col items-center">
      <AdmitOneTicket
        width={340}
        presenter="CHEM 242 study decks"
        event="Deck submission"
        name={user ? "Welcome" : "Admit one"}
        venue={user?.email ? user.email.split("@")[0] : "Staff only"}
        dates={user ? "signed in" : "sign in to enter"}
        stubText={open ? "Open" : "Add a deck"}
        watermark="242"
        onClick={() => setOpen((o) => !o)}
      />

      <p className="mt-3 max-w-sm text-center text-xs text-slate-400 dark:text-stone-500">
        Got a question list? Authorized staff can turn a .txt into a deck.{" "}
        {/* Relative, not absolute: the site is served from a subpath on GitHub
            Pages, so a leading slash would land on the domain root. */}
        <a
          href="deck-format.html"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-indigo-500 underline decoration-dotted underline-offset-4 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          How to write one
        </a>
      </p>

      {open && (
        <div className="mt-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-stone-800 dark:bg-stone-900">
          {!configured ? (
            <p className="text-sm text-slate-500 dark:text-stone-400">
              Sign-in is not configured on this build. Set{" "}
              <code className="font-mono text-xs">VITE_GOOGLE_CLIENT_ID</code> and{" "}
              <code className="font-mono text-xs">VITE_APPS_SCRIPT_ENDPOINT</code> in{" "}
              <code className="font-mono text-xs">.env.local</code> to enable uploads.
            </p>
          ) : !user ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-slate-600 dark:text-stone-300">
                Sign in with the Google account on the allowlist.
              </p>
              <div ref={renderButton} />
              <button
                onClick={signIn}
                disabled={!ready}
                className="text-xs font-semibold text-indigo-600 underline decoration-dotted underline-offset-4 disabled:opacity-50 dark:text-indigo-300"
              >
                {ready ? "Or use the one-tap prompt" : "Loading sign-in…"}
              </button>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-slate-500 dark:text-stone-400">{user.email}</p>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-200"
                >
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500"
              >
                <Upload className="h-4 w-4" />
                {fileName || "Attach a .txt"}
              </button>

              {result && (
                <div className="mt-4 space-y-3">
                  {result.errors.map((e) => (
                    <p key={e} className="flex gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {e}
                    </p>
                  ))}
                  {result.warnings.map((w) => (
                    <p key={w} className="flex gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {w}
                    </p>
                  ))}

                  {result.deck && (
                    <>
                      <p className="text-sm font-semibold text-slate-800 dark:text-stone-100">
                        {result.deck.title} · {result.deck.questions.length} questions
                      </p>
                      {/* Previewed with the real card, so what you approve is
                          exactly what students will see. */}
                      <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3 dark:bg-stone-950">
                        {result.deck.questions.slice(0, 3).map((item, i) => (
                          <QuestionCard
                            key={i}
                            num={i + 1}
                            item={item}
                            status="none"
                            onRate={() => {}}
                          />
                        ))}
                      </div>

                      <button
                        onClick={publish}
                        disabled={status === "sending" || status === "done"}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {status === "sending" ? "Publishing…" : "Publish deck"}
                      </button>
                    </>
                  )}

                  {serverMessage && (
                    <p
                      className={cn(
                        "text-sm",
                        status === "done"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {serverMessage}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default DeckUploadTicket;
