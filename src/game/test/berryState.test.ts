/**
 * The third and fourth mascot axes: state and costume.
 *
 * Three things are checked here and each one guards a different failure.
 *
 * 1. The COMPOSITION RULES in berryState.ts. Sway and blush are the only two
 *    numbers a state and a mood both have an opinion about, and they resolve
 *    differently on purpose (sway is won outright, blush adds). A silent swap
 *    of those two rules would look plausible in a diff and would make an
 *    aromatic berry sway, which is the one thing aromatic means.
 *
 * 2. The 31 WANTED STATES from docs/MASCOT.md, as a table. The doc's claim is
 *    that 21 of the 31 are compositions of code that already shipped, 6 need
 *    one new state each and 4 are deferred. That claim is only true while
 *    every mood, behaviour and state it names still exists under that name, so
 *    the table asserts each row against the three registries and the group
 *    counts against the doc's own summary. If somebody renames a mood, this is
 *    what says which of the 31 design states just stopped being expressible.
 *
 * 3. NIGHTCAP IS NOT AN IN-APP COSTUME. MASCOT.md: "Notification art only,
 *    never an in-app state". That is a rule about a map's range, which is
 *    exactly the kind of rule a test can hold and a comment cannot.
 *
 * Plus a contrast check on the badge's token pair, because the state work adds
 * the first new visible glyph since a literal white sign shipped on a near
 * white disc (STATUS.md, 2026-08-27). The check reads the tokens out of
 * theme.css and measures them, rather than trusting the comment beside them.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BERRY_STATES,
  CHARRED_RECOVER_MS,
  STATE_SHAPE,
  composeStateAndMood,
  type BerryState,
} from "../mascot/berryState";
import { BERRY_MOODS, MOOD_SHAPE, type BerryMood } from "../mascot/berryMood";
import { BEHAVIOURS, type BerryBehaviour } from "../mascot/berryBehaviour";
import {
  BERRY_COSTUMES,
  BERRY_SURFACES,
  IN_APP_COSTUMES,
  NOTIFICATION_COSTUME,
  costumeForSurface,
  type BerryCostume,
} from "../mascot/berryCostume";

/* ------------------------------------------------------------- the shapes -- */

describe("STATE_SHAPE", () => {
  it("has the eight states docs/MASCOT.md proposes, and no more", () => {
    expect(BERRY_STATES).toEqual([
      "neutral",
      "charged",
      "protonated",
      "carbocation",
      "radical",
      "resonance",
      "aromatic",
      "charred",
    ]);
    expect(Object.keys(STATE_SHAPE).sort()).toEqual([...BERRY_STATES].sort());
  });

  it("keeps every knob in the range a renderer assumes", () => {
    for (const state of BERRY_STATES) {
      const shape = STATE_SHAPE[state];
      expect(shape.darken, `${state} darken`).toBeGreaterThanOrEqual(0);
      expect(shape.darken, `${state} darken`).toBeLessThanOrEqual(1);
      expect(shape.blush, `${state} blush`).toBeGreaterThanOrEqual(0);
      expect(shape.blush, `${state} blush`).toBeLessThanOrEqual(1);
      expect(shape.haloStrength, `${state} haloStrength`).toBeGreaterThanOrEqual(0);
      expect(shape.haloStrength, `${state} haloStrength`).toBeLessThanOrEqual(1);
      expect([1, 2], `${state} ghostCount`).toContain(shape.ghostCount);
      expect(shape.jitterPx, `${state} jitterPx`).toBeGreaterThanOrEqual(0);
      expect(shape.sparkRate, `${state} sparkRate`).toBeGreaterThanOrEqual(0);
      expect(shape.smokeRate, `${state} smokeRate`).toBeGreaterThanOrEqual(0);
      expect([null, "H+", "+", "•"], `${state} badge`).toContain(shape.badge);
    }
  });

  it("draws neutral as nothing at all, so the default costs no rendering", () => {
    const shape = STATE_SHAPE.neutral;
    expect(shape).toEqual({
      darken: 0,
      blush: 0,
      haloKind: "none",
      haloStrength: 0,
      ghostCount: 1,
      split: false,
      jitterPx: 0,
      sparkRate: 0,
      smokeRate: 0,
      liftExtra: 0,
      badge: null,
      swayOverride: null,
      recoverMs: null,
    });
  });

  it("gives each named state the transform its MASCOT.md row asks for", () => {
    expect(STATE_SHAPE.charged.haloKind).toBe("static");
    expect(STATE_SHAPE.protonated.badge).toBe("H+");
    expect(STATE_SHAPE.protonated.liftExtra).toBeGreaterThan(0);
    expect(STATE_SHAPE.carbocation.jitterPx).toBeGreaterThan(0);
    expect(STATE_SHAPE.carbocation.sparkRate).toBeGreaterThan(0);
    expect(STATE_SHAPE.carbocation.badge).toBe("+");
    expect(STATE_SHAPE.radical.split).toBe(true);
    expect(STATE_SHAPE.radical.haloKind).toBe("unpaired");
    expect(STATE_SHAPE.resonance.ghostCount).toBe(2);
    expect(STATE_SHAPE.aromatic.haloKind).toBe("ring");
    expect(STATE_SHAPE.aromatic.swayOverride).toBe(0);
    expect(STATE_SHAPE.charred.darken).toBeGreaterThan(0);
    expect(STATE_SHAPE.charred.smokeRate).toBeGreaterThan(0);
  });

  it("charred is the only state that recovers, and it recovers inside one second", () => {
    // The tone rule, docs/MASCOT.md: "A `sad` mood after a miss recovers inside
    // one second and never holds." Charred is the visual half of that beat, so
    // it carries the same clock.
    expect(CHARRED_RECOVER_MS).toBe(1000);
    expect(STATE_SHAPE.charred.recoverMs).toBe(1000);
    const recovering = BERRY_STATES.filter((state) => STATE_SHAPE[state].recoverMs !== null);
    expect(recovering).toEqual(["charred"]);
  });

  it("leaves the berry solid in every state but resonance", () => {
    // "Two translucent copies trading opacity, NEVER one" is the whole lesson
    // of the resonance state, so it is the only state allowed a second copy.
    const doubled = BERRY_STATES.filter((state) => STATE_SHAPE[state].ghostCount === 2);
    expect(doubled).toEqual(["resonance"]);
  });
});

/* -------------------------------------------------------- the composition -- */

describe("composeStateAndMood", () => {
  it("leaves the mood's sway alone for every state that does not override it", () => {
    for (const state of BERRY_STATES) {
      if (STATE_SHAPE[state].swayOverride !== null) continue;
      for (const mood of BERRY_MOODS) {
        expect(composeStateAndMood(state, mood).sway, `${state} + ${mood}`).toBe(
          MOOD_SHAPE[mood].sway,
        );
      }
    }
  });

  it("lets the state win the sway outright when it overrides", () => {
    // An aromatic berry that keeps swaying is not aromatic, whatever its mood,
    // so this holds for the loosest mood in the set as well as the stillest.
    for (const mood of BERRY_MOODS) {
      expect(composeStateAndMood("aromatic", mood).sway, mood).toBe(0);
    }
    const loosest = BERRY_MOODS.reduce((a, b) => (MOOD_SHAPE[a].sway >= MOOD_SHAPE[b].sway ? a : b));
    expect(MOOD_SHAPE[loosest].sway).toBeGreaterThan(0);
    expect(composeStateAndMood("aromatic", loosest).sway).toBe(0);
  });

  it("adds blush rather than replacing it", () => {
    // A protonated thinking berry is redder than a thinking one, and neither
    // number should be able to hide the other.
    const face = MOOD_SHAPE.thinking.blush;
    const state = STATE_SHAPE.protonated.blush;
    expect(state).toBeGreaterThan(0);
    expect(composeStateAndMood("protonated", "thinking").blush).toBeCloseTo(face + state, 10);
  });

  it("clamps blush at 1 instead of overflowing", () => {
    // `shy` already blushes at 1, which is the case that would push past the
    // top of the range and make the CSS opacity invalid.
    expect(MOOD_SHAPE.shy.blush).toBe(1);
    expect(composeStateAndMood("protonated", "shy").blush).toBe(1);
  });

  it("returns numbers inside 0 to 1 for every one of the 104 pairs", () => {
    let pairs = 0;
    for (const state of BERRY_STATES) {
      for (const mood of BERRY_MOODS) {
        const composed = composeStateAndMood(state, mood);
        expect(composed.sway, `${state} + ${mood} sway`).toBeGreaterThanOrEqual(0);
        expect(composed.sway, `${state} + ${mood} sway`).toBeLessThanOrEqual(1);
        expect(composed.blush, `${state} + ${mood} blush`).toBeGreaterThanOrEqual(0);
        expect(composed.blush, `${state} + ${mood} blush`).toBeLessThanOrEqual(1);
        pairs += 1;
      }
    }
    expect(pairs).toBe(BERRY_STATES.length * BERRY_MOODS.length);
  });
});

/* ------------------------------------------------------ the 31 decomposed -- */

type WantedGroup = "ambient" | "answer" | "progression" | "chemical";

interface Wanted {
  readonly wanted: string;
  readonly group: WantedGroup;
  /** Absent means docs/MASCOT.md defers the row: it needs particle work, not a transform. */
  readonly state?: BerryState;
  readonly mood?: BerryMood;
  readonly behaviours?: readonly BerryBehaviour[];
}

/**
 * docs/MASCOT.md, "The 31 wanted states, decomposed", transcribed row for row.
 *
 * The compound behaviour cells are arrays because that is what they are: the
 * doc writes "squash then bounce" and "bounce x n", and both are a sequence of
 * behaviours the machine already plays, which is the doc's point.
 */
const WANTED: readonly Wanted[] = [
  // Ambient. Six rows, zero new work.
  { wanted: "Idle breathe", group: "ambient", state: "neutral", mood: "curious", behaviours: ["idle"] },
  { wanted: "Blink and glance", group: "ambient", state: "neutral", mood: "curious", behaviours: ["idle"] },
  { wanted: "Bored", group: "ambient", state: "neutral", mood: "sleepy", behaviours: ["idle"] },
  { wanted: "Peek at the canvas", group: "ambient", state: "neutral", mood: "curious", behaviours: ["leanIn"] },
  { wanted: "Dormant, 7+ days away", group: "ambient", state: "neutral", mood: "sleepy", behaviours: ["sleepy"] },
  { wanted: "Zen focus, timed quiz", group: "ambient", state: "neutral", mood: "focused", behaviours: ["idle"] },

  // Answer reactions. Eight rows, one new state.
  { wanted: "Correct", group: "answer", state: "neutral", mood: "happy", behaviours: ["squash", "bounce"] },
  { wanted: "Combo, escalating", group: "answer", state: "neutral", mood: "excited", behaviours: ["bounce"] },
  { wanted: "Near miss", group: "answer", state: "neutral", mood: "thinking", behaviours: ["leanIn"] },
  { wanted: "Wrong", group: "answer", state: "neutral", mood: "sad", behaviours: ["squash"] },
  { wanted: "Wrong again, offers hint", group: "answer", state: "neutral", mood: "curious", behaviours: ["leanIn"] },
  { wanted: "Thinking", group: "answer", state: "neutral", mood: "thinking", behaviours: ["idle"] },
  { wanted: "Panic, last 10s", group: "answer", state: "neutral", mood: "stressed", behaviours: ["stressed"] },
  { wanted: "Oxidized, third miss", group: "answer", state: "charred", mood: "sad", behaviours: ["stressed"] },

  // Progression. Eight rows, zero new work.
  { wanted: "XP pop", group: "progression", state: "neutral", mood: "happy", behaviours: ["bounce"] },
  { wanted: "Diamond catch", group: "progression", state: "neutral", mood: "cheer", behaviours: ["celebrate"] },
  { wanted: "Lesson complete", group: "progression", state: "neutral", mood: "cheer", behaviours: ["celebrate"] },
  { wanted: "Unit complete", group: "progression", state: "neutral", mood: "proud", behaviours: ["celebrate"] },
  { wanted: "Level up", group: "progression", state: "neutral", mood: "proud", behaviours: ["celebrate"] },
  { wanted: "Streak lit", group: "progression", state: "neutral", mood: "excited", behaviours: ["bounce"] },
  { wanted: "Streak at risk", group: "progression", state: "neutral", mood: "curious", behaviours: ["leanIn"] },
  { wanted: "Streak saved by a rest day", group: "progression", state: "neutral", mood: "calm", behaviours: ["wave"] },

  // Chemical. Nine rows: five new states, four deferred. "Each needs its state
  // and nothing else", so each one rides the ambient default face and motion.
  { wanted: "Protonated", group: "chemical", state: "protonated", mood: "curious", behaviours: ["idle"] },
  { wanted: "Carbocation", group: "chemical", state: "carbocation", mood: "curious", behaviours: ["idle"] },
  { wanted: "Radical", group: "chemical", state: "radical", mood: "curious", behaviours: ["idle"] },
  { wanted: "Resonance", group: "chemical", state: "resonance", mood: "curious", behaviours: ["idle"] },
  { wanted: "Aromatic", group: "chemical", state: "aromatic", mood: "curious", behaviours: ["idle"] },
  { wanted: "Deprotonated", group: "chemical" },
  { wanted: "Solvated", group: "chemical" },
  { wanted: "Enantiomers", group: "chemical" },
  { wanted: "Excited state", group: "chemical" },
];

describe("the 31 wanted states from docs/MASCOT.md", () => {
  it("is 31 rows in the group sizes the doc's summary table claims", () => {
    expect(WANTED).toHaveLength(31);
    const sizes = { ambient: 0, answer: 0, progression: 0, chemical: 0 };
    for (const row of WANTED) sizes[row.group] += 1;
    expect(sizes).toEqual({ ambient: 6, answer: 8, progression: 8, chemical: 9 });
  });

  it("splits 21 free, 6 needing a new state, 4 deferred, as the doc claims", () => {
    const free = WANTED.filter((row) => row.state === "neutral");
    const needsNewState = WANTED.filter((row) => row.state !== undefined && row.state !== "neutral");
    const deferred = WANTED.filter((row) => row.state === undefined);
    expect(free).toHaveLength(21);
    expect(needsNewState).toHaveLength(6);
    expect(deferred).toHaveLength(4);
    // The six are exactly the six non-neutral states, each used once.
    expect(needsNewState.map((row) => row.state).sort()).toEqual(
      ["aromatic", "carbocation", "charred", "protonated", "radical", "resonance"],
    );
  });

  it.each(WANTED.filter((row) => row.state !== undefined))(
    "$wanted decomposes into registered parts",
    (row) => {
      expect(row.state, `${row.wanted} state`).toBeDefined();
      expect(BERRY_STATES, `${row.wanted} state`).toContain(row.state);
      expect(STATE_SHAPE[row.state as BerryState], `${row.wanted} shape`).toBeDefined();

      expect(row.mood, `${row.wanted} mood`).toBeDefined();
      expect(BERRY_MOODS, `${row.wanted} mood`).toContain(row.mood);
      expect(MOOD_SHAPE[row.mood as BerryMood], `${row.wanted} face`).toBeDefined();

      expect(row.behaviours, `${row.wanted} behaviours`).toBeDefined();
      for (const behaviour of row.behaviours ?? []) {
        expect(BEHAVIOURS[behaviour], `${row.wanted} behaviour ${behaviour}`).toBeDefined();
        expect(BEHAVIOURS[behaviour].keyframes.length).toBeGreaterThan(1);
      }
    },
  );

  it.each(WANTED.filter((row) => row.state === undefined))(
    "$wanted is deferred and has no state to render",
    (row) => {
      expect(row.state).toBeUndefined();
      // Nothing named like a deferred row leaked into the union.
      const slug = row.wanted.toLowerCase().replace(/[^a-z]/g, "");
      expect(BERRY_STATES.map((state) => state.toLowerCase())).not.toContain(slug);
    },
  );

  it("needs no behaviour and no mood the two shipped files do not already have", () => {
    // The doc's headline claim: "Nothing needs a new behaviour, a new mood, or
    // a new keyframe track." This is that sentence, executable.
    const moods = new Set<string>();
    const behaviours = new Set<string>();
    for (const row of WANTED) {
      if (row.mood !== undefined) moods.add(row.mood);
      for (const behaviour of row.behaviours ?? []) behaviours.add(behaviour);
    }
    for (const mood of moods) expect(BERRY_MOODS).toContain(mood);
    for (const behaviour of behaviours) expect(Object.keys(BEHAVIOURS)).toContain(behaviour);
  });
});

/* -------------------------------------------------------------- costumes -- */

describe("costumeForSurface", () => {
  it("answers for every surface, with a costume that exists", () => {
    for (const surface of BERRY_SURFACES) {
      const costume = costumeForSurface(surface);
      expect(BERRY_COSTUMES, surface).toContain(costume);
    }
  });

  it("never returns the nightcap, on any surface", () => {
    // docs/MASCOT.md: "Nightcap | Notification art only, never an in-app state."
    expect(NOTIFICATION_COSTUME).toBe("nightcap");
    for (const surface of BERRY_SURFACES) {
      expect(costumeForSurface(surface), surface).not.toBe(NOTIFICATION_COSTUME);
    }
    expect(IN_APP_COSTUMES).not.toContain(NOTIFICATION_COSTUME);
    expect(IN_APP_COSTUMES).toHaveLength(BERRY_COSTUMES.length - 1);
  });

  it("reaches every in-app costume from at least one surface", () => {
    // A costume nothing can ask for is a costume that is not shipped, whatever
    // the union says.
    const reached = new Set<BerryCostume>(BERRY_SURFACES.map(costumeForSurface));
    for (const costume of IN_APP_COSTUMES) {
      expect([...reached], costume).toContain(costume);
    }
  });

  it("maps the rows MASCOT.md's costume table names, and defaults the rest", () => {
    expect(costumeForSurface("reactionNode")).toBe("labcoat");
    expect(costumeForSurface("conceptNode")).toBe("tweed");
    expect(costumeForSurface("spectroscopyNode")).toBe("trench");
    expect(costumeForSurface("branchNode")).toBe("backpack");
    expect(costumeForSurface("unitQuiz")).toBe("referee");
    expect(costumeForSurface("leaderboards")).toBe("cape");
    // Unnamed surfaces take the table's own default, rather than inventing one.
    expect(costumeForSurface("periodic")).toBe("labcoat");
    expect(costumeForSurface("chat")).toBe("labcoat");
  });
});

/* ------------------------------------------------------- the badge tokens -- */

const themeCss = readFileSync(new URL("../theme.css", import.meta.url), "utf8");
const mascotCss = readFileSync(new URL("../mascot/mascot.css", import.meta.url), "utf8");

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const clean = hex.trim().replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** theme.css keeps the dark palette in a `.dark { ... }` block after `:root`. */
const [lightHalf = "", darkHalf = ""] = ((): [string, string] => {
  const marker = "\n.dark {";
  const at = themeCss.indexOf(marker);
  expect(at, "theme.css should still carry a .dark block").toBeGreaterThan(0);
  return [themeCss.slice(0, at), themeCss.slice(at)];
})();

function token(half: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(half);
  expect(match, `${name} should be a literal hex in this half of theme.css`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("the state badge meets WCAG AA in both themes", () => {
  it("puts the sign on the chip at 4.5:1 or better, light and dark", () => {
    for (const [themeName, half] of [
      ["light", lightHalf],
      ["dark", darkHalf],
    ] as const) {
      const chip = token(half, "charge-chip");
      const ink = token(half, "charge-ink");
      expect(contrast(chip, ink), `${themeName}: ${ink} on ${chip}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the chip itself 3:1 clear of the page ground, light and dark", () => {
    for (const [themeName, half] of [
      ["light", lightHalf],
      ["dark", darkHalf],
    ] as const) {
      const chip = token(half, "charge-chip");
      const ground = token(half, "bb-background");
      expect(contrast(chip, ground), `${themeName}: ${chip} on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every meaning-bearing state mark 3:1 clear of the page, both themes", () => {
    // WCAG 1.4.11 for a graphic. These four are the contrast table written at
    // the top of mascot.css's state block, made executable: the comment was
    // computed by hand, and a hand computation is a claim rather than a check.
    // Smoke is deliberately absent: the darkening is what says "charred" and
    // the puffs are embellishment, so they are not held to the graphics floor.
    const marks = [
      ["charged halo, full", "good"],
      ["charged halo, empty", "bb-muted-foreground"],
      ["aromatic ring", "bb-primary-ink"],
      ["radical dot and sparks", "warn-ink-strong"],
    ] as const;
    for (const [themeName, half] of [
      ["light", lightHalf],
      ["dark", darkHalf],
    ] as const) {
      const ground = token(half, "bb-background");
      for (const [what, name] of marks) {
        const colour = token(half, name);
        expect(
          contrast(colour, ground),
          `${themeName} ${what}: ${colour} on ${ground}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("uses tokens and not literal colours anywhere in the state CSS", () => {
    // The bug this guards is not "a wrong hex", it is "a hex at all": a literal
    // colour is right in exactly one theme by construction, which is how a
    // white sign shipped on a near white disc (STATUS.md, 2026-08-27).
    const at = mascotCss.indexOf("STATES. The third axis");
    expect(at, "mascot.css should still carry the state block").toBeGreaterThan(0);
    const stateBlock = mascotCss.slice(at);
    const literals = stateBlock.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(literals).toEqual([]);
    expect(stateBlock).toContain("var(--charge-chip)");
    expect(stateBlock).toContain("var(--charge-ink)");
  });
});
