/**
 * AI chat, the Tier 3 tail. The server that meters it is Phase 7.
 *
 * What is real here: the composer, the message list, the press contract, and
 * the explanation of where this sits in the three tiers. What is not: any
 * model call. Send is disabled with a reason rather than hidden, because a
 * student who finds the tab should learn what it will do, not wonder why it
 * is empty.
 */

import { useState } from "react";
import { Card, Pill } from "../../app/ui/Card";

export default function ChatTab() {
  const [draft, setDraft] = useState("");
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-scale-lg font-semibold">Ask Blueberry</h2>
          <Pill>Phase 7</Pill>
        </div>
        <p className="mt-2 text-scale-sm text-bb-muted-foreground">
          Most feedback in Blueberry is written by a person and served instantly: every named
          cause in the trainer and every anticipated wrong answer in a lesson has authored copy.
          This chat is the third tier, for the attempt nothing matched. It sees your current
          problem, it is metered per day, and it arrives with the server in Phase 7.
        </p>
      </Card>

      <div className="flex-1 rounded-2xl border border-dashed border-bb-border p-6 text-center text-scale-sm text-bb-muted-foreground">
        No messages yet.
      </div>

      <form className="flex gap-2" onSubmit={(event) => event.preventDefault()}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder="Ask about the step you are on"
          aria-label="Message"
          className="min-h-11 flex-1 rounded-2xl border-2 border-bb-input bg-bb-card px-3 text-scale-base"
        />
        <button
          type="submit"
          disabled
          title="Sending needs the Phase 7 server, which meters the budget"
          className="press min-h-11 rounded-2xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary px-4 font-semibold text-bb-primary-foreground disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
