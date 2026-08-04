"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlippingCard } from "@/components/ui/flipping-card";
import { SnapCarousel } from "@/components/ui/snap-carousel";
import { Lens } from "@/components/ui/magnifier-lens";
import type { PreviewOptions } from "@/components/ui/hover-deck";
import type { DeckGroup } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * A reference deck dealt out as cards, either in a grid or one at a time.
 *
 * The table is still the right default. A pKa ladder is something you read down
 * and compare across, which a stack of cards cannot do. But comparing is not the
 * same as recalling, and the table has no way to quiz you on a single row: quiz
 * mode blurs the answer, and your eye takes in the six rows around it anyway.
 *
 * So the same rows also deal out as flashcards. The front asks, the back
 * answers, and the carousel puts one on screen at a time so nothing else is
 * visible to read off.
 *
 * The crop is what makes this work at all. These diagrams are scans of the class
 * handout with the answer printed beside the structure, which is why
 * `ReferenceDeck.preview.cropRight` exists. The front of the card reuses it to
 * cut the answer off, and only the back shows the sheet uncropped. Without that
 * the question side would be handing over the thing it is asking for.
 */

const cardSrc = (name: string) => `${import.meta.env.BASE_URL}cards/${name}.png`;

interface Row {
  heading?: string;
  title: string;
  description: string;
  badge: string;
  image?: string;
}

function Face({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full w-full flex-col p-4", className)}>{children}</div>
  );
}

function RowCard({
  row,
  flipped,
  onFlip,
  cropStyle,
  magnify,
}: {
  row: Row;
  flipped: boolean;
  onFlip: () => void;
  cropStyle?: React.CSSProperties;
  magnify?: PreviewOptions["magnify"];
}) {
  return (
    <FlippingCard
      width={320}
      height={330}
      flipped={flipped}
      onFlip={onFlip}
      className="w-full max-w-full"
      frontContent={
        <Face>
          {row.heading && (
            <span className="font-mono text-[0.65rem] tracking-wider text-indigo-500 uppercase dark:text-indigo-300">
              {row.heading}
            </span>
          )}
          <p className="mt-1 text-lg leading-snug font-bold text-slate-800 dark:text-stone-100">
            {row.title}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-stone-400">{row.description}</p>

          {row.image && (
            <div className="mt-2 flex flex-1 items-center justify-center overflow-hidden">
              {/* Cropped, so the value printed on the handout beside the
                  structure is not sitting on the question side of the card. */}
              <img
                src={cardSrc(row.image)}
                alt=""
                loading="lazy"
                className="max-h-full w-full object-contain"
                style={cropStyle}
              />
            </div>
          )}

          <span className="mt-auto font-mono text-[0.68rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
            click to flip
          </span>
        </Face>
      }
      backContent={
        <Face>
          <span className="font-mono text-[0.65rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
            {row.title}
          </span>
          <p className="mt-1 text-3xl leading-none font-bold text-indigo-600 dark:text-indigo-300">
            {row.badge}
          </p>

          {row.image && (
            <div className="mt-3 flex flex-1 items-center justify-center overflow-hidden">
              {/* The lens goes on the back and not the front. The front's image
                  is cropped to keep the answer hidden, and magnifying a crop
                  would only enlarge the half you are allowed to see. */}
              {magnify ? (
                <Lens lensSize={magnify.lensSize ?? 150} zoomFactor={magnify.zoomFactor ?? 2}>
                  <img
                    src={cardSrc(row.image)}
                    alt={row.title}
                    loading="lazy"
                    className="max-h-full w-full object-contain"
                  />
                </Lens>
              ) : (
                <img
                  src={cardSrc(row.image)}
                  alt={row.title}
                  loading="lazy"
                  className="max-h-full w-full object-contain"
                />
              )}
            </div>
          )}

          <p className="mt-auto text-xs text-slate-500 dark:text-stone-400">{row.description}</p>
        </Face>
      }
    />
  );
}

export function ReferenceCards({
  groups,
  preview,
  layout,
}: {
  groups: DeckGroup[];
  preview?: PreviewOptions;
  layout: "flip" | "carousel";
}) {
  const rows = useMemo<Row[]>(
    () => groups.flatMap((g) => g.items.map((item) => ({ ...item, heading: g.heading }))),
    [groups],
  );

  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [index, setIndex] = useState(0);

  const cropStyle = preview?.cropRight
    ? { clipPath: `inset(0 ${preview.cropRight} 0 0)` }
    : undefined;

  const toggle = useCallback((i: number) => setFlipped((f) => ({ ...f, [i]: !f[i] })), []);

  // The carousel counts past both ends and wraps, so the raw index is not
  // always a real row. Space has to act on the card actually showing.
  const safe = rows.length ? ((index % rows.length) + rows.length) % rows.length : 0;

  /**
   * Space turns the card that is showing, without having to tab to it first.
   *
   * The card already flips on Enter or Space when it has focus, but drilling in
   * the carousel means arrowing or clicking through and never touching the card
   * itself, so the key that ought to be the whole interaction did nothing.
   *
   * It bows out whenever something else has a claim on the key: a text field, or
   * anything exposing itself as a button. That second case covers both the
   * toolbar, where Space should press the button you tabbed to, and the card
   * itself, whose own handler should run rather than firing alongside this one
   * and flipping twice.
   */
  useEffect(() => {
    if (layout !== "carousel") return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
          el.closest('[role="button"], button, a'))
      ) {
        return;
      }

      // Otherwise the page scrolls a screen down under the carousel.
      e.preventDefault();
      toggle(safe);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout, safe, toggle]);

  const cards = rows.map((row, i) => (
    <RowCard
      key={`${row.title}-${i}`}
      row={row}
      flipped={flipped[i] ?? false}
      onFlip={() => toggle(i)}
      cropStyle={cropStyle}
      magnify={preview?.magnify}
    />
  ));

  if (layout === "carousel") {
    return (
      <SnapCarousel label="Reference rows" index={safe} onIndexChange={setIndex}>
        {cards}
      </SnapCarousel>
    );
  }

  return <div className="grid gap-5 sm:grid-cols-2">{cards}</div>;
}

export default ReferenceCards;
