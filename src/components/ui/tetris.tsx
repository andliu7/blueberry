import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tetris, for the break and only the break.
 *
 * Small on purpose. This is what you do for five minutes after looking out of a
 * window, not a game to get lost in, so it is ten columns by eighteen rows in a
 * card rather than anything you would want to keep a high score in.
 *
 * Written from scratch rather than pulled in: every Tetris package is either
 * larger than the rest of this page or comes with its own canvas renderer, and
 * the whole thing is a 10x18 array of numbers and one interval.
 *
 * The board is a flat `Uint8Array` of colour indices, 0 for empty. Flat rather
 * than nested because line clearing is then a `copyWithin` instead of a splice
 * and a rebuild, and because a fresh array of arrays every tick is the kind of
 * garbage that makes a small game stutter on a slow laptop.
 */

const COLS = 10;
const ROWS = 18;

/**
 * The seven pieces, each as its rotations, each rotation a list of `[x, y]`.
 *
 * Rotations are written out rather than computed. Rotating a matrix is four
 * lines of code and then a week of arguing about wall kicks; a literal table is
 * unambiguous, and at seven pieces it is shorter than the argument.
 */
const PIECES: { cells: [number, number][][]; colour: number }[] = [
  // I
  {
    colour: 1,
    cells: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
    ],
  },
  // O
  { colour: 2, cells: [[[1, 0], [2, 0], [1, 1], [2, 1]]] },
  // T
  {
    colour: 3,
    cells: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  // S
  {
    colour: 4,
    cells: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
    ],
  },
  // Z
  {
    colour: 5,
    cells: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
    ],
  },
  // J
  {
    colour: 6,
    cells: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
  },
  // L
  {
    colour: 7,
    cells: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  },
];

const COLOURS = [
  "",
  "bg-cyan-400",
  "bg-amber-300",
  "bg-fuchsia-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-indigo-400",
  "bg-orange-400",
];

/** Points per simultaneous line clear, the standard curve. */
const LINE_SCORE = [0, 40, 100, 300, 1200];

interface Active {
  piece: number;
  rot: number;
  x: number;
  y: number;
}

function randomPiece(): Active {
  return { piece: Math.floor(Math.random() * PIECES.length), rot: 0, x: 3, y: -1 };
}

function cellsOf(a: Active): [number, number][] {
  const rots = PIECES[a.piece].cells;
  return rots[a.rot % rots.length].map(([x, y]) => [a.x + x, a.y + y]);
}

export function Tetris({ className }: { className?: string }) {
  const [board, setBoard] = useState(() => new Uint8Array(COLS * ROWS));
  const [active, setActive] = useState<Active>(randomPiece);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const boardRef = useRef(board);
  boardRef.current = board;

  const fits = useCallback((a: Active, b: Uint8Array) => {
    return cellsOf(a).every(
      ([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || b[y * COLS + x] === 0),
    );
  }, []);

  /** Settle the piece, clear any full rows, and hand over the next one. */
  const lock = useCallback(
    (a: Active) => {
      const next = Uint8Array.from(boardRef.current);
      for (const [x, y] of cellsOf(a)) {
        if (y >= 0) next[y * COLS + x] = PIECES[a.piece].colour;
      }

      // Walk up from the floor, copying surviving rows down. `write` trails
      // `read` by exactly the number of rows cleared so far, which means one
      // pass and no allocation.
      let write = ROWS - 1;
      let cleared = 0;
      for (let read = ROWS - 1; read >= 0; read--) {
        const full = next.subarray(read * COLS, read * COLS + COLS).every((v) => v !== 0);
        if (full) {
          cleared++;
          continue;
        }
        if (write !== read) next.copyWithin(write * COLS, read * COLS, read * COLS + COLS);
        write--;
      }
      // Anything above the last surviving row is now empty sky.
      if (cleared > 0) next.fill(0, 0, (write + 1) * COLS);

      setBoard(next);
      if (cleared > 0) {
        setLines((n) => n + cleared);
        setScore((s) => s + LINE_SCORE[cleared]);
      }

      const fresh = randomPiece();
      // Topped out: the next piece has nowhere to appear.
      if (!fits(fresh, next)) setOver(true);
      else setActive(fresh);
    },
    [fits],
  );

  const move = useCallback(
    (dx: number, dy: number) => {
      if (over || paused) return;
      setActive((a) => {
        const next = { ...a, x: a.x + dx, y: a.y + dy };
        if (fits(next, boardRef.current)) return next;
        // Blocked downward means it has landed; blocked sideways means nothing.
        if (dy > 0) lock(a);
        return a;
      });
    },
    [fits, lock, over, paused],
  );

  const rotate = useCallback(() => {
    if (over || paused) return;
    setActive((a) => {
      const rots = PIECES[a.piece].cells.length;
      const turned = { ...a, rot: (a.rot + 1) % rots };
      // A minimal wall kick: if the rotation clips a wall, try shifting one
      // then two cells either way before giving up. Without this, rotating
      // against the edge simply does nothing and feels broken.
      for (const dx of [0, -1, 1, -2, 2]) {
        const candidate = { ...turned, x: turned.x + dx };
        if (fits(candidate, boardRef.current)) return candidate;
      }
      return a;
    });
  }, [fits, over, paused]);

  const drop = useCallback(() => {
    if (over || paused) return;
    setActive((a) => {
      let landed = a;
      while (fits({ ...landed, y: landed.y + 1 }, boardRef.current)) {
        landed = { ...landed, y: landed.y + 1 };
      }
      lock(landed);
      return landed;
    });
  }, [fits, lock, over, paused]);

  const reset = () => {
    setBoard(new Uint8Array(COLS * ROWS));
    setActive(randomPiece());
    setScore(0);
    setLines(0);
    setOver(false);
    setPaused(false);
  };

  // Speeds up every ten lines, to a floor of 120ms.
  const tickMs = Math.max(120, 620 - Math.floor(lines / 10) * 70);
  useEffect(() => {
    if (over || paused) return;
    const id = setInterval(() => move(0, 1), tickMs);
    return () => clearInterval(id);
  }, [move, tickMs, over, paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only when nothing is being typed into, or the arrow keys would fight
      // the task box in the same card.
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const handled: Record<string, () => void> = {
        ArrowLeft: () => move(-1, 0),
        ArrowRight: () => move(1, 0),
        ArrowDown: () => move(0, 1),
        ArrowUp: rotate,
        " ": drop,
      };
      const fn = handled[e.key];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, rotate, drop]);

  /** The board plus the falling piece, as one array to render. */
  const view = useMemo(() => {
    const v = Uint8Array.from(board);
    if (!over) {
      for (const [x, y] of cellsOf(active)) {
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) v[y * COLS + x] = PIECES[active.piece].colour;
      }
    }
    return v;
  }, [board, active, over]);

  return (
    <div className={cn("select-none", className)}>
      <div className="flex items-center gap-2 px-1 pb-1.5">
        <span className="font-mono text-[0.6rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
          {score} pts
        </span>
        <span className="flex-1 font-mono text-[0.6rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
          {lines} lines
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Resume" : "Pause"}
          className="cursor-pointer rounded p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-stone-100"
        >
          {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="New game"
          className="cursor-pointer rounded p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-stone-100"
        >
          <RotateCw className="size-3" />
        </button>
      </div>

      <div className="relative">
        <div
          className="grid gap-px rounded-lg bg-slate-200 p-px dark:bg-stone-800"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          role="img"
          aria-label={`Tetris board, ${lines} lines cleared, ${score} points`}
        >
          {Array.from(view).map((v, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-[1px]",
                v === 0 ? "bg-white dark:bg-stone-950" : COLOURS[v],
              )}
            />
          ))}
        </div>

        {(over || paused) && (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-white/85 backdrop-blur-[2px] dark:bg-stone-950/85">
            <div className="text-center">
              <p className="text-sm font-semibold">{over ? "Topped out" : "Paused"}</p>
              {over && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-2 cursor-pointer rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                >
                  Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Touch controls. The keyboard is the good way to play this, but the
          card is reachable on a phone and arrow keys are not. */}
      <div className="mt-1.5 grid grid-cols-4 gap-1">
        <PadButton onClick={() => move(-1, 0)} label="Left">
          ←
        </PadButton>
        <PadButton onClick={rotate} label="Rotate">
          ↻
        </PadButton>
        <PadButton onClick={() => move(1, 0)} label="Right">
          →
        </PadButton>
        <PadButton onClick={drop} label="Drop">
          ↓
        </PadButton>
      </div>
    </div>
  );
}

function PadButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="cursor-pointer rounded-lg border border-slate-200 py-1 text-sm text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-stone-800 dark:text-stone-300 dark:hover:border-indigo-400/50"
    >
      {children}
    </button>
  );
}

export default Tetris;
