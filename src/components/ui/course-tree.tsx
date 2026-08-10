import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Folder, FolderOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COURSES,
  DECK_GROUPS,
  deckCount,
  deckHref,
  foldersUnder,
  type CourseNode,
  type Deck,
  type DeckGroupId,
} from "@/data/types";

/**
 * The whole site as a tree you can open and close in place.
 *
 * Adapted from a shadcn tree component rather than pasted. What was kept is the
 * structure worth keeping: a context holding the expanded set, a row that
 * toggles on click, and an `AnimatePresence` height animation on the children.
 * What was dropped is everything the original needed to be generic and this does
 * not: the selection model, multi-select with ctrl, the connector lines, the
 * per-node context, and the requirement that every caller hand-write a nested
 * JSX tree matching their data. This walks `COURSES` instead, so the hierarchy
 * lives in the data and there is one place to change it.
 *
 * `motion/react`, which is the current name for the package the original
 * imported as `framer-motion`. Already a dependency here, so nothing was added.
 *
 * Why it exists next to the folder cards rather than instead of them: the cards
 * are what you look at, and this is what you use when you know where you are
 * going. A deck three levels down is one click here and three there.
 *
 * It used to bring its own drawer and its own header button. Both are gone: the
 * drawer is now one panel of `Dashboard`, which owns the sliding, the backdrop
 * and the Escape key for every panel rather than for this one alone. What is
 * left here is the tree, which is the only part that was ever about courses.
 */

const SPRING = { duration: 0.22, ease: "easeOut" as const };

function Row({
  depth,
  onClick,
  open,
  hasChildren,
  label,
  count,
  muted,
  leaf,
}: {
  depth: number;
  onClick?: () => void;
  open?: boolean;
  hasChildren: boolean;
  label: string;
  count?: number;
  muted?: boolean;
  leaf?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={muted}
      style={{ paddingLeft: depth * 20 + 10 }}
      className={cn(
        // Roomier than it was. The rows were set at the density of a file tree
        // in an editor, which is right when you are scanning a hundred of them
        // and wrong for a list of nine that is the main way into the site: they
        // read as one grey block and there was nothing to aim a cursor at.
        "group flex w-full items-center gap-2 rounded-lg py-2.5 pr-2.5 text-left transition",
        muted
          ? "cursor-default opacity-40"
          : "hover:bg-slate-100 dark:hover:bg-stone-800",
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {hasChildren ? (
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={SPRING}>
            <ChevronRight className="size-3.5 text-slate-400 dark:text-stone-500" />
          </motion.span>
        ) : null}
      </span>
      <span className="flex size-4 shrink-0 items-center justify-center text-slate-400 dark:text-stone-500">
        {leaf ? (
          <Layers className="size-3.5" />
        ) : open ? (
          <FolderOpen className="size-3.5" />
        ) : (
          <Folder className="size-3.5" />
        )}
      </span>
      <span
        className={cn(
          "flex-1 truncate text-sm",
          leaf
            ? "text-slate-600 dark:text-stone-400"
            : "font-medium text-slate-800 dark:text-stone-200",
        )}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="shrink-0 font-mono text-[0.7rem] text-slate-400 dark:text-stone-500">
          {count}
        </span>
      )}
    </button>
  );
}

function Branch({
  node,
  decks,
  depth,
  onPick,
}: {
  node: CourseNode;
  decks: Deck[];
  depth: number;
  onPick: (href: string) => void;
}) {
  const leaves = foldersUnder(node);
  const total = decks.filter((d) => leaves.includes((d.group ?? "lab") as DeckGroupId)).length;
  // An empty course is still a real part of the site and says so, greyed, rather
  // than being hidden and looking like it was forgotten.
  const empty = !node.children?.length && !node.folders?.length;
  const [open, setOpen] = useState(depth === 0 && !empty);

  return (
    <div>
      <Row
        depth={depth}
        hasChildren={!empty}
        open={open}
        muted={empty}
        label={node.title}
        count={empty ? undefined : total}
        onClick={() => setOpen((o) => !o)}
      />
      <AnimatePresence initial={false}>
        {open && !empty && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            {node.children?.map((child) => (
              <Branch
                key={child.id}
                node={child}
                decks={decks}
                depth={depth + 1}
                onPick={onPick}
              />
            ))}
            {node.folders?.map((fid) => {
              const group = DECK_GROUPS.find((g) => g.id === fid);
              if (!group) return null;
              const inside = decks.filter((d) => (d.group ?? "lab") === fid);
              return (
                <FolderBranch
                  key={fid}
                  title={group.title}
                  decks={inside}
                  depth={depth + 1}
                  onPick={onPick}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FolderBranch({
  title,
  decks,
  depth,
  onPick,
}: {
  title: string;
  decks: Deck[];
  depth: number;
  onPick: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Row
        depth={depth}
        hasChildren={decks.length > 0}
        open={open}
        label={title}
        count={decks.length}
        onClick={() => setOpen((o) => !o)}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            {decks.map((deck) => (
              <Row
                key={deck.id}
                depth={depth + 1}
                hasChildren={false}
                leaf
                label={deck.short ?? deck.title}
                count={deckCount(deck)}
                onClick={() => onPick(deckHref(deck))}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CourseTree({
  decks,
  className,
  bare = false,
  onNavigate,
}: {
  decks: Deck[];
  className?: string;
  /** Drop the panel chrome, for when something else is already providing it. */
  bare?: boolean;
  /** Fired after a deck row is followed, so a drawer can shut behind it. */
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="All decks"
      className={cn(
        // A gap between the courses, so "Organic Chemistry II" and "Uploaded"
        // are two things rather than one run of rows.
        "space-y-1.5",
        !bare &&
          "rounded-2xl border border-slate-200 bg-white/70 p-2 backdrop-blur dark:border-stone-700 dark:bg-stone-900/60",
        className,
      )}
    >
      {COURSES.map((node) => {
        const go = (href: string) => {
          window.location.hash = href.replace(/^#/, "");
          onNavigate?.();
        };

        // A node whose only content is one folder of the same name is that
        // folder, and drawing both is a row that opens to reveal itself.
        // Uploaded was the case in practice.
        const only =
          !node.children?.length && node.folders?.length === 1
            ? DECK_GROUPS.find((g) => g.id === node.folders![0])
            : undefined;
        if (only && only.title === node.title) {
          return (
            <FolderBranch
              key={node.id}
              title={only.title}
              decks={decks.filter((d) => (d.group ?? "lab") === only.id)}
              depth={0}
              onPick={go}
            />
          );
        }

        return (
          <Branch key={node.id} node={node} decks={decks} depth={0} onPick={go} />
        );
      })}
    </nav>
  );
}

export default CourseTree;
