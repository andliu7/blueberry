/**
 * A thread with several people in it, each recognisable by their face.
 *
 * ## Why a chat is the honest demo of a deterministic avatar
 *
 * Group chat is where "everyone has a picture" stops being cosmetic. Names in
 * a thread are read once and then skipped, so what actually carries who said
 * what is the thing in the left column, and in most products that thing is a
 * grey circle with a letter in it. A blobatar makes the column informative for
 * free: one prop per person, no upload flow, no default asset, and the same
 * handle produces the same creature in the sidebar, in the thread, and in the
 * mention autocomplete.
 *
 * ## Grouping is done here rather than stored
 *
 * Consecutive messages from one person collapse under one face. That is a
 * presentation rule, not a shape for the data: a thread that inserts a message
 * in the middle regroups on its own, where a stored list of runs would have to
 * be rebuilt. Pass a flat array in order.
 *
 * Owner-supplied component (pasted 2026-10-15), copied as given; the Messages
 * tab integration adapts it. The one addition is `variant="bubbles"` with
 * `self`, an opt-in iPhone Messages layout for the game's Messages tab. The
 * default `variant="log"` renders exactly what was pasted.
 */
"use client";

import { Blobatar } from "@blobatar/react";
import type { BlobatarOptions } from "blobatar";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  /** The seed and the display name. Use an id and pass `title` if the two differ. */
  name: string;
  /** Shown instead of `name`. The face still comes from `name`. */
  title?: string;
  text: string;
  /** Already formatted, for the same reason `User.lastSeen` is. */
  time?: string;
};

export type GroupChatProps = {
  messages: ChatMessage[];
  /** The room. Rendered with a `#` in front of it, Slack-style. */
  channel?: string;
  /** Faces for the header, overlapping. Names, not messages. */
  members?: string[];
  /** How many members the pile is not showing. */
  extra?: number;
  /** Whoever is mid-message. Renders the trailing indicator. */
  typing?: string;
  /**
   * Passed to every face in the thread, the pile and the indicator. A house
   * style is a property of the room, not of each message: two people drawn
   * under different rules read as two products.
   */
  blobatar?: BlobatarOptions;
  className?: string;
  /**
   * "log" is the pasted Slack-style thread. "bubbles" draws the same runs as
   * iPhone Messages does: other people on the left in grey bubbles with their
   * face on the last one, `self` on the right in purple with no face.
   */
  variant?: "log" | "bubbles";
  /** In "bubbles", the name whose messages are the reader's own. */
  self?: string;
  /**
   * In "bubbles", options for one face, merged over `blobatar`. For a thread
   * whose two senders must not read as the same disc at a glance.
   */
  faces?: Record<string, BlobatarOptions>;
  /** In "bubbles", the name a screen reader hears for `typing`, when the seed is an id. */
  typingTitle?: string;
  /**
   * In "bubbles", whether each run is labelled with its sender's name. On by
   * default for a group; a one-to-one thread turns it off, as iPhone Messages
   * does, because the header already says who it is.
   */
  names?: boolean;
};

/** Consecutive messages from one person become one group with one face. */
function grouped(messages: ChatMessage[]): ChatMessage[][] {
  return messages.reduce<ChatMessage[][]>((runs, message) => {
    const last = runs.at(-1);
    if (last && last[0]!.name === message.name) last.push(message);
    else runs.push([message]);
    return runs;
  }, []);
}

export function GroupChat({
  messages,
  channel,
  members,
  extra,
  typing,
  blobatar,
  className,
  variant = "log",
  self,
  faces,
  typingTitle,
  names = true,
}: GroupChatProps) {
  const runs = grouped(messages);

  if (variant === "bubbles") {
    return (
      <BubbleThread
        runs={runs}
        typing={typing}
        typingTitle={typingTitle}
        blobatar={blobatar}
        faces={faces}
        self={self}
        names={names}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-card text-card-foreground border-border flex w-full flex-col rounded-xl border",
        className,
      )}
    >
      {(channel || members?.length) && (
        <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-3">
          {channel ? (
            <span className="font-mono text-sm">
              <span className="text-muted-foreground">#</span> {channel}
            </span>
          ) : (
            <span />
          )}

          {/*
            The facepile, and the ring is what makes it one. Blobatars are
            transparent-backdrop silhouettes, so two overlapping bare ones merge
            into a single unreadable blob; `background="circle"` plus a ring in
            the card's own colour is what separates each disc from the one
            behind it. That is also why this component sets an opaque `bg-card`
            rather than a translucent surface: the ring has to match something.
          */}
          {members?.length ? (
            <div className="flex items-center" aria-hidden="true">
              {members.map((member) => (
                <Blobatar
                  key={member}
                  name={member}
                  background="circle"
                  {...blobatar}
                  alt=""
                  className="ring-card -ml-2 size-7 rounded-full ring-2 first:ml-0"
                />
              ))}
              {extra ? (
                <span className="bg-accent text-muted-foreground ring-card -ml-2 grid size-7 place-items-center rounded-full font-mono text-[0.6rem] ring-2">
                  +{extra}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-5 px-5 py-5">
        {runs.map((run) => (
          <div
            // The run's identity, not its author's: one person speaking twice
            // in a thread is two runs, and keying on the name alone would make
            // React reuse the first one's nodes for the second.
            key={`${run[0]!.name}-${run[0]!.time ?? ""}-${run.length}`}
            className="flex gap-3"
          >
            {/*
              `animate="hover"` is affordable here and would not be in the user
              table: a thread is a dozen faces, not a page of them, and the
              reaction lands on the one you are pointing at. It needs the
              library's stylesheet, imported once anywhere in your app:
              `import "blobatar/motion.css"`. Without it the face is correct and
              simply does not move.
            */}
            <Blobatar
              name={run[0]!.name}
              {...blobatar}
              animate="hover"
              title={`${run[0]!.title ?? run[0]!.name}`}
              className="size-10 shrink-0"
            />

            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">
                  {run[0]!.title ?? run[0]!.name}
                </span>
                {run[0]!.time ? (
                  <span className="text-muted-foreground font-mono text-[0.7rem]">
                    {run[0]!.time}
                  </span>
                ) : null}
              </div>

              {/* Every message in the run under one name, which is the whole
                  reason to group them. Repeating the sender on each line is
                  what makes a real chat log unreadable. */}
              <div className="mt-1 flex flex-col gap-1">
                {run.map((message) => (
                  <p
                    key={message.text}
                    className="text-muted-foreground text-sm leading-relaxed"
                  >
                    {message.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {typing ? (
          <div className="flex items-center gap-3">
            {/*
              Bare, like every other face in the thread. The disc that used to
              be here made the person who is mid-message look like a different
              kind of thing from the person who just posted, which is the one
              impression this row must not give: it is the same person, a
              moment earlier. Opacity is the whole difference.
            */}
            <Blobatar
              name={typing}
              {...blobatar}
              alt=""
              className="size-10 shrink-0 opacity-50"
            />
            {/* A live region, because the point of a typing indicator is that it
                arrives after you stopped looking. `polite`, so it waits for a
                gap rather than interrupting. */}
            <div
              aria-live="polite"
              className="text-muted-foreground flex items-center gap-2 text-xs"
            >
              {typing} is typing
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The iPhone Messages layout of the same runs. Kept beside GroupChat rather
 * than folded into its JSX so the pasted "log" markup above stays as given.
 */
function BubbleThread({
  runs,
  typing,
  typingTitle,
  blobatar,
  faces,
  self,
  names,
  className,
}: {
  runs: ChatMessage[][];
  typing?: string;
  typingTitle?: string;
  blobatar?: BlobatarOptions;
  faces?: Record<string, BlobatarOptions>;
  self?: string;
  names: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {runs.map((run, at) => {
        const first = run[0]!;
        const mine = self !== undefined && first.name === self;
        return (
          <div
            // Position in the thread, not the author: a thread only ever grows
            // at the end, so an index key is stable here.
            key={`${at}-${first.name}`}
            className="flex flex-col gap-1"
          >
            {first.time ? (
              <p className="text-bb-muted-foreground py-1 text-center text-[0.7rem] font-semibold">
                {first.time}
              </p>
            ) : null}
            {!mine && names ? (
              <span className="text-bb-muted-foreground ml-12 text-[0.7rem] font-semibold">
                {first.title ?? first.name}
              </span>
            ) : null}
            <div className={cn("flex items-end gap-2", mine && "justify-end")}>
              {!mine ? (
                <Blobatar
                  name={first.name}
                  background="circle"
                  {...blobatar}
                  {...faces?.[first.name]}
                  alt=""
                  title={first.title ?? first.name}
                  className="size-9 shrink-0"
                />
              ) : null}
              <div className={cn("flex min-w-0 max-w-[78%] flex-col gap-0.5", mine ? "items-end" : "items-start")}>
                {run.map((message, index) => (
                  <p
                    key={index}
                    className={cn(
                      "whitespace-pre-wrap break-words px-3.5 py-2 text-[0.95rem] leading-snug",
                      // Rounded on every corner but the one pointing at the
                      // sender, on the last bubble of a run: the iPhone tail.
                      "rounded-[1.25rem]",
                      mine
                        ? "bg-bb-primary text-bb-primary-foreground"
                        : "bg-bb-muted text-bb-foreground",
                      index === run.length - 1 && (mine ? "rounded-br-md" : "rounded-bl-md"),
                    )}
                  >
                    {message.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {typing ? (
        <div className="flex items-end gap-2">
          <Blobatar
            name={typing}
            background="circle"
            {...blobatar}
            {...faces?.[typing]}
            alt=""
            className="size-9 shrink-0 opacity-50"
          />
          <div
            aria-live="polite"
            className="bg-bb-muted flex items-center gap-1 rounded-[1.25rem] rounded-bl-md px-4 py-3"
          >
            <span className="sr-only">{typingTitle ?? typing} is typing</span>
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                aria-hidden="true"
                className="bg-bb-muted-foreground size-2 rounded-full motion-safe:animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GroupChat;
