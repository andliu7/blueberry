import { useState } from "react";
import { CheckCircle2, AlertTriangle, LogOut, Trash2 } from "lucide-react";
import { FileUpload, type FileUploadItem } from "@/components/ui/be-ui-file-upload";
import { AdmitOneTicket } from "@/components/ui/admit-one-ticket";
import { QuestionCard } from "@/components/QuestionCard";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { parseDeckText, type ParseResult } from "@/lib/parseDeckText";
import { endpointFor, postToAppsScript } from "@/lib/appsScript";
import { useDecks, refreshDecks, forgetDeck } from "@/lib/useDecks";
import { deckCount, deckHref } from "@/data/types";
import { PassphraseGate } from "@/components/ui/passphrase-gate";
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
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [serverMessage, setServerMessage] = useState("");
  const [queue, setQueue] = useState<FileUploadItem[]>([]);
  const { published } = useDecks();
  // Which deck is mid-delete, and which one has been armed by a first click.
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  const onFile = async (file: File) => {
    setStatus("idle");
    setServerMessage("");
    const parsed = parseDeckText(await file.text());
    setResult(parsed);
    // The queue row reports on the parse, since that is the only work that
    // happens when a file lands: nothing is uploaded until Publish is pressed.
    setQueue((q) =>
      q.map((item) =>
        item.name === file.name
          ? {
              ...item,
              progress: 100,
              status: parsed.deck ? "success" : "error",
              error: parsed.errors[0],
            }
          : item,
      ),
    );
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
      // Re-reads the sheet so the new deck joins the Uploaded folder without a
      // page reload, and so it appears in the list below straight away.
      refreshDecks();
    } else {
      setStatus("failed");
      setServerMessage(
        body.error === "unreachable"
          ? "Could not reach the deck endpoint."
          : (body.error ?? "The server refused the upload."),
      );
    }
  };

  /**
   * Removes a published deck.
   *
   * Only the published ones are listed here, so there is no way to aim this at a
   * built-in deck: those live in the repository and are not in the sheet the
   * script deletes from. The server checks the token and the allowlist again
   * regardless, since a button the browser decides to show is not a permission.
   */
  const remove = async (id: string) => {
    if (!user) return;
    setRemoving(id);
    setRemoveError("");
    const body = await postToAppsScript("deleteDeck", { idToken: user.idToken, id });
    setRemoving(null);
    setConfirming(null);
    if (body.ok) {
      forgetDeck(id);
    } else {
      setRemoveError(
        body.error === "unreachable"
          ? "Could not reach the deck endpoint."
          : (body.error ?? "The server refused the delete."),
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

      {/* The gate renders the form only once it is satisfied, so the two are
          one block rather than two conditions that can disagree. */}
      {open && (
        <PassphraseGate className="mt-6">
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

              <FileUpload
                value={queue}
                onValueChange={setQueue}
                onFilesAdded={(_added, files) => files[0] && onFile(files[0])}
                onRemove={() => {
                  setResult(null);
                  setStatus("idle");
                  setServerMessage("");
                }}
                accept=".txt,text/plain"
                maxFiles={1}
                title="Drop a .txt deck here"
                description="One file. Parsed in your browser before anything is sent."
              />

              <p className="mt-3 text-xs text-slate-400 dark:text-stone-500">
                Not sure of the format?{" "}
                <a
                  href="deck-format.html"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-500 underline decoration-dotted underline-offset-4"
                >
                  Read the guide
                </a>{" "}
                or{" "}
                <a
                  href="sample-deck.txt"
                  download
                  className="font-semibold text-indigo-500 underline decoration-dotted underline-offset-4"
                >
                  download a sample
                </a>
                .
              </p>

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

              {/* Only the published decks are listed, which is the whole point:
                  the built-in decks are part of the site and are not something a
                  sign-in should be able to take down. */}
              {published.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4 dark:border-stone-800">
                  <p className="text-sm font-semibold text-slate-800 dark:text-stone-100">
                    Published decks
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
                    Uploaded from a file, so these are the ones that can be removed.
                  </p>

                  <ul className="mt-3 space-y-2">
                    {published.map((deck) => (
                      <li
                        key={deck.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-stone-800"
                      >
                        <a
                          href={deckHref(deck)}
                          className="min-w-0 flex-1 text-sm text-slate-700 hover:text-indigo-600 dark:text-stone-300 dark:hover:text-indigo-300"
                        >
                          <span className="block truncate font-semibold">{deck.title}</span>
                          <span className="font-mono text-[0.7rem] text-slate-400 dark:text-stone-500">
                            {deckCount(deck)} cards
                          </span>
                        </a>

                        {/* Two clicks, because there is no undo: the row is gone
                            from the sheet and the .txt it came from is on
                            someone's laptop, not on the server. */}
                        {confirming === deck.id ? (
                          <span className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => remove(deck.id)}
                              disabled={removing === deck.id}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
                            >
                              {removing === deck.id ? "Deleting…" : "Delete"}
                            </button>
                            <button
                              onClick={() => setConfirming(null)}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-200"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirming(deck.id);
                              setRemoveError("");
                            }}
                            aria-label={`Delete ${deck.title}`}
                            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {removeError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{removeError}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* The way through to the workspace.

              Inside the opened ticket rather than out in the footer, because
              this is already the staff door: it says "staff only, sign in to
              enter" on its face, and it is already behind the passphrase by the
              time you can read this. A second entrance out in the open would
              undo the reason the gate exists.

              Outside the three-way branch above, so it is there whether you are
              signed out, signed in, or looking at an unconfigured build. The
              workspace is a different destination from uploading a deck, and
              wanting it does not depend on how the upload form happens to be
              feeling. */}
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-stone-800 dark:text-stone-400">
            Admin?{" "}
            <a
              href="#/signin"
              className="font-semibold text-indigo-600 underline decoration-dotted underline-offset-4 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Click here to sign in to the workspace
            </a>{" "}
            for feedback, the to-do board and admin management.
          </p>
        </div>
        </PassphraseGate>
      )}
    </section>
  );
}

export default DeckUploadTicket;
