/**
 * The deck tray's fan: geometry a critic can hold a ruler to.
 *
 * The committed deck-tray image draws a symmetric hand of cards WHOLLY INSIDE
 * the phone frame AND READS EVERY NAME ON IT. Round 1 escaped the frame, so
 * this suite grew THE RULER, the exact fit inequality. Round 2 fitted and was
 * still wrong, because THE RULER was only an upper bound: the fan legally
 * squeezed to a 22 to 28px step against a 112px card and the critic measured
 * 10 to 14 percent of five of the six names visible. Fifteen tests were green
 * over a fan that read one word.
 *
 * So the suite now holds BOTH ends. THE FLOOR below is the second half, and
 * it asserts the property the critic actually measured: the visible band of
 * every dealt card contains that card's whole name box. It is written as the
 * geometry a DOM sampler would see (each card is overlapped from the right by
 * its successor, since z-index rises with index), not as a restatement of
 * tray.ts's own formula, so a change to that formula has to survive it.
 */

import { describe, expect, it } from "vitest";

import {
  FAN_CARD_BORDER,
  FAN_CARD_H,
  FAN_CARD_PAD_X,
  FAN_CARD_W,
  FAN_EDGE_GUTTER,
  FAN_LIFT,
  FAN_LIFT_SCALE,
  FAN_MAX,
  FAN_NAME_OVERHANG,
  FAN_OVERLAP,
  FAN_NAME_STRIP,
  FAN_REFERENCE_WIDTH,
  FAN_ROT_MAX,
  FAN_X_STEP_MAX,
  nameWidthPx,
  fanCapacity,
  fanCards,
  fanLayout,
  fanNameFloor,
  fanNameShift,
  fanStep,
  rotatedHalfWidth,
  TRAY_ART,
  trayCard,
  trayDeckExposure,
  trayLabel,
  trayTitle,
} from "../cards/ui/tray";
import type { Card } from "../cards/types";

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    front: "Which carbon does the nucleophile hit?",
    back: "The one carrying the leaving group.",
    why: "Backside attack needs the sigma star.",
    tags: [],
    source: { kind: "lesson", lessonId: "l", beatId: "b" },
    ...overrides,
  };
}

/** Every width worth asserting at: smallest phone, reference, column cap. */
const WIDTHS = [320, 360, FAN_REFERENCE_WIDTH, 414, 448] as const;

describe("the fan's geometry", () => {
  it("a hand of one sits dead centre and upright", () => {
    expect(fanLayout(1, 0)).toEqual({ x: 0, y: 0, rot: 0 });
  });

  it("is symmetric: slot i mirrors slot n-1-i", () => {
    for (let count = 2; count <= FAN_MAX; count += 1) {
      for (let i = 0; i < count; i += 1) {
        const left = fanLayout(count, i);
        const right = fanLayout(count, count - 1 - i);
        expect(left.x).toBeCloseTo(-right.x);
        expect(left.rot).toBeCloseTo(-right.rot);
        expect(left.y).toBeCloseTo(right.y);
      }
    }
  });

  it("an odd hand's middle card is centred, upright, and the hand's highest", () => {
    for (const count of [5, 7]) {
      const middle = fanLayout(count, (count - 1) / 2);
      expect(middle.x).toBe(0);
      expect(middle.rot).toBe(0);
      for (let i = 0; i < count; i += 1) {
        expect(fanLayout(count, i).y).toBeGreaterThanOrEqual(middle.y);
      }
    }
  });

  it("slots march left to right, in order, drooping toward the edges", () => {
    for (let count = 2; count <= FAN_MAX; count += 1) {
      for (let i = 1; i < count; i += 1) {
        expect(fanLayout(count, i).x).toBeGreaterThan(fanLayout(count, i - 1).x);
        expect(fanLayout(count, i).rot).toBeGreaterThan(fanLayout(count, i - 1).rot);
      }
    }
  });

  it("tilt and step stay inside their caps at every hand size", () => {
    for (let count = 1; count <= FAN_MAX; count += 1) {
      for (let i = 0; i < count; i += 1) {
        const slot = fanLayout(count, i);
        expect(Math.abs(slot.rot)).toBeLessThanOrEqual(FAN_ROT_MAX * ((count - 1) / 2) + 1e-9);
        expect(Math.abs(slot.x)).toBeLessThanOrEqual(FAN_X_STEP_MAX * ((count - 1) / 2) + 1e-9);
      }
    }
  });

  it("THE RULER: every card's rotated extent fits its container, at every width", () => {
    // 320 is the smallest phone the breakpoints in DESIGN-TOKENS name below
    // 480; 390 is the reference device; 448 is the max-w-md column cap. The
    // inequality is the exact horizontal bounding box of a centre-rotated
    // rectangle, which is the real painted extent, not the untransformed
    // border box. Held for EVERY count, not only the dealt one, so the
    // ceiling cannot quietly stop being a ceiling if capacity changes.
    for (const width of [...WIDTHS, 768]) {
      for (let count = 1; count <= FAN_MAX; count += 1) {
        for (let i = 0; i < count; i += 1) {
          const slot = fanLayout(count, i, width);
          const extent = Math.abs(slot.x) + rotatedHalfWidth(slot.rot);
          expect(extent).toBeLessThanOrEqual(width / 2 - FAN_EDGE_GUTTER + 1e-9);
        }
      }
    }
  });

  it("round 1's escape is dead: a full hand at 390px stays on screen", () => {
    // The critic measured the old fan at left=-84 and right=474 on a 390px
    // host. Reconstruct both edges from the new slots and assert they sit
    // inside [0, 390].
    for (let i = 0; i < FAN_MAX; i += 1) {
      const slot = fanLayout(FAN_MAX, i, 390);
      const centre = 390 / 2 + slot.x;
      const half = rotatedHalfWidth(slot.rot);
      expect(centre - half).toBeGreaterThanOrEqual(0);
      expect(centre + half).toBeLessThanOrEqual(390);
    }
  });

  it("two cards sit further apart per card than seven do", () => {
    const two = fanLayout(2, 1).x - fanLayout(2, 0).x;
    const seven = fanLayout(7, 1).x - fanLayout(7, 0).x;
    expect(two).toBeGreaterThan(seven);
  });

  it("the card box is portrait and the name fits inside it", () => {
    // DeckTray sizes each card FROM these constants (style, not classes), so
    // paint and geometry cannot drift; what still needs asserting is that the
    // box is a card shape and that a name can fit in it at all, since a name
    // wider than its own card could never be wholly visible at any step.
    expect(FAN_CARD_H).toBeGreaterThan(FAN_CARD_W);
    expect(FAN_NAME_STRIP).toBeLessThanOrEqual(FAN_CARD_W);
  });

  /**
   * THE ROUND 2 DEFECT, PINNED. The strip was set equal to FAN_CARD_W, which
   * is the BORDER box, while DeckTray painted each card with a 2px border and
   * 4px of padding a side: the label's real box was 56px against a 68px
   * bound, and the critic measured Diels-Alder and Williamson painting 63px
   * and Ozonolysis 61px into it, each bleeding onto the card beside it. The
   * bound is the CONTENT box now, and this is the assertion that says so, so
   * a later hand that adds a border back cannot leave the number behind.
   */
  it("THE STATED BOUND IS THE PAINTED BOUND: the strip is the card's content box", () => {
    expect(FAN_NAME_STRIP).toBe(FAN_CARD_W - 2 * FAN_CARD_BORDER - 2 * FAN_CARD_PAD_X);
    expect(FAN_CARD_BORDER).toBeGreaterThanOrEqual(0);
    expect(FAN_CARD_PAD_X).toBeGreaterThanOrEqual(0);
  });

  it("catches the round 2 chrome: a bordered, padded card shrinks the bound", () => {
    // The property is only worth having if it can fail. Round 2's own chrome,
    // run through the same derivation, gives 56 rather than 68, which is the
    // number the critic measured the names overflowing.
    const roundTwoBorder = 2;
    const roundTwoPadX = 4;
    expect(68 - 2 * roundTwoBorder - 2 * roundTwoPadX).toBe(56);
    expect(nameWidthPx("Diels-Alder")).toBeGreaterThan(56);
    expect(nameWidthPx("Williamson")).toBeGreaterThan(56);
    expect(nameWidthPx("Ozonolysis")).toBeGreaterThan(56);
  });

  it("rotatedHalfWidth is exact at the angles a hand uses", () => {
    expect(rotatedHalfWidth(0)).toBeCloseTo(FAN_CARD_W / 2);
    // 90 degrees would present the card's height as width.
    expect(rotatedHalfWidth(90)).toBeCloseTo(FAN_CARD_H / 2);
    // Symmetric in sign, monotone over a hand's range.
    expect(rotatedHalfWidth(-20)).toBeCloseTo(rotatedHalfWidth(20));
    expect(rotatedHalfWidth(30)).toBeGreaterThan(rotatedHalfWidth(10));
  });
});

describe("THE FLOOR: every dealt card's name is readable", () => {
  /**
   * What a DOM sampler over the name strips would see. Card i is drawn under
   * card i+1 (z-index rises with index) and over card i-1, so the band of
   * card i that nothing covers runs from its own left edge to its successor's
   * left edge. The last card is wholly visible. Returns the fraction of the
   * painted name box that survives, which is the number the round 2 critic
   * measured at 10 to 14 percent.
   *
   * ROUND 4 ADDED TWO TERMS AND KEPT THE 100 PERCENT BAR. The name is no
   * longer centred on its card: cards.css shifts it left into the visible
   * band by tray.ts's fanNameShift, and .fan__name paints past the card's own
   * edge by up to FAN_NAME_OVERHANG, which is what the committed image's
   * labels do. Both terms are in the model now, so this measures the box the
   * browser paints rather than a box the stylesheet stopped drawing. The
   * assertion it feeds is unchanged: nothing under 100 percent passes.
   */
  function nameVisibleFraction(count: number, index: number, width: number): number {
    const step = fanStep(count, width);
    const centre = fanLayout(count, index, width).x;
    const cardLeft = centre - FAN_CARD_W / 2;
    const coverLeft = index === count - 1 ? Infinity : centre + step - FAN_CARD_W / 2;
    const shift = fanNameShift(count, index, width);
    const nameLeft = centre - shift - FAN_NAME_STRIP / 2;
    const nameRight = centre - shift + FAN_NAME_STRIP / 2;
    // The label may overhang its own card; what it may not do is disappear
    // under the neighbour, which is the half the eye actually loses.
    const visibleLeft = Math.max(nameLeft, cardLeft - FAN_NAME_OVERHANG);
    const visibleRight = Math.min(nameRight, coverLeft);
    return Math.max(0, visibleRight - visibleLeft) / FAN_NAME_STRIP;
  }

  it("is the derived inequality, not a taste value", () => {
    expect(fanNameFloor()).toBe(FAN_NAME_STRIP - FAN_NAME_OVERHANG);
  });

  it("the shift is zero on the top card and never pushes a name off its own overhang", () => {
    for (const width of WIDTHS) {
      const dealt = fanCapacity(width);
      expect(fanNameShift(dealt, dealt - 1, width)).toBe(0);
      for (let i = 0; i < dealt; i += 1) {
        const shift = fanNameShift(dealt, i, width);
        expect(shift).toBeGreaterThanOrEqual(0);
        expect(shift).toBeLessThanOrEqual(FAN_CARD_W / 2 + FAN_NAME_OVERHANG - FAN_NAME_STRIP / 2);
      }
    }
  });

  it("a dealt hand's step always clears the floor", () => {
    for (const width of WIDTHS) {
      const dealt = fanCapacity(width);
      expect(dealt).toBeGreaterThanOrEqual(1);
      if (dealt > 1) expect(fanStep(dealt, width)).toBeGreaterThanOrEqual(fanNameFloor());
    }
  });

  it("EVERY name on a dealt hand is 100 percent visible, at every width", () => {
    // The round 2 measurement, run as arithmetic: 14/13/13/10/13/13 percent
    // for six of seven cards, 100 only for the top one. Nothing under 100 is
    // acceptable here, because a spine label half covered is not a name.
    for (const width of WIDTHS) {
      const dealt = fanCapacity(width);
      for (let i = 0; i < dealt; i += 1) {
        expect(nameVisibleFraction(dealt, i, width)).toBeGreaterThanOrEqual(1 - 1e-9);
      }
    }
  });

  it("catches the round 2 fan: an over-dealt hand fails the same measurement", () => {
    // The floor is only worth having if it can fail. Deal one more card than
    // the width can pay for and the property must break, at every width where
    // the ceiling has not already capped the hand.
    for (const width of WIDTHS) {
      const over = fanCapacity(width) + 1;
      if (over > FAN_MAX) continue;
      const fractions = Array.from({ length: over }, (_, i) => nameVisibleFraction(over, i, width));
      expect(Math.min(...fractions)).toBeLessThan(1);
    }
  });

  it("capacity is monotone in width, so a wider frame never deals fewer", () => {
    for (let i = 1; i < WIDTHS.length; i += 1) {
      expect(fanCapacity(WIDTHS[i]!)).toBeGreaterThanOrEqual(fanCapacity(WIDTHS[i - 1]!));
    }
  });

  it("the step is non-increasing in hand size, which is what lets capacity be a search", () => {
    for (const width of WIDTHS) {
      for (let count = 3; count <= FAN_MAX; count += 1) {
        expect(fanStep(count, width)).toBeLessThanOrEqual(fanStep(count - 1, width) + 1e-9);
      }
    }
  });

  it("the reference phone reads SIX names, which is what the image draws", () => {
    // Round 3 dealt five here and named the image's six as the reference
    // cheating. It was not cheating; its labels overhang their cards, and
    // fanNameShift is that fact as arithmetic. The floor fell from 68 to 52
    // and the sixth card fits with every name still wholly visible, which the
    // assertion above checks rather than assumes. Regression pin for the
    // three widths the hand is solved at.
    expect(fanCapacity(FAN_REFERENCE_WIDTH)).toBe(6);
    expect(fanCapacity(320)).toBe(5);
    expect(fanCapacity(448)).toBe(7);
  });

  it("the hand OVERLAPS: the step is narrower than the card, at every width", () => {
    // The round 3 defect, pinned: FAN_X_STEP_MAX was 76 against a 72px card,
    // so a dealt hand settled on 71.1px of step and the cards touched without
    // ever covering each other. "Five cards spread with clear daylight...
    // the hand does not read as one hand" is what the critic measured.
    for (const width of WIDTHS) {
      const dealt = fanCapacity(width);
      if (dealt < 2) continue;
      const step = fanStep(dealt, width);
      expect(step).toBeLessThanOrEqual(FAN_CARD_W * (1 - FAN_OVERLAP) + 1e-9);
      expect(step).toBeGreaterThan(0);
    }
  });

  it("the arc is SHALLOW and the lift is what carries the height", () => {
    // The other half of the same finding: "a much deeper arc, and a large
    // empty void between the lifted card's bottom edge and the arc below it".
    // The image's resting tops span 22 CSS px across the whole hand and its
    // raised card's foot sits a few pixels BELOW them.
    const dealt = fanCapacity(FAN_REFERENCE_WIDTH);
    const ys = Array.from({ length: dealt }, (_, i) => fanLayout(dealt, i, FAN_REFERENCE_WIDTH).y);
    const spread = Math.max(...ys) - Math.min(...ys);
    expect(spread).toBeLessThanOrEqual(30);

    // The chosen card is the middle one. Lifted and scaled about its centre,
    // its painted foot must land BELOW the tops of the cards either side of
    // it, so the raised card overlaps the hand instead of floating over it.
    const middle = Math.floor((dealt - 1) / 2);
    const raisedTop = fanLayout(dealt, middle, FAN_REFERENCE_WIDTH).y - FAN_LIFT;
    const grown = (FAN_CARD_H * (FAN_LIFT_SCALE - 1)) / 2;
    const raisedFoot = raisedTop + FAN_CARD_H + grown;
    const neighbourTop = Math.min(
      fanLayout(dealt, middle - 1, FAN_REFERENCE_WIDTH).y,
      fanLayout(dealt, middle + 1, FAN_REFERENCE_WIDTH).y,
    );
    expect(raisedFoot).toBeGreaterThan(neighbourTop);
    // And not so far below that it stops reading as raised at all.
    expect(raisedFoot - neighbourTop).toBeLessThan(FAN_CARD_H / 2);
  });
});

describe("what the fan deals", () => {
  it("caps the hand at FAN_MAX and at what the width can read", () => {
    const cards = Array.from({ length: FAN_MAX + 3 }, (_, i) => card(`c${i}`));
    for (const width of WIDTHS) {
      const hand = fanCards(cards, width);
      expect(hand).toHaveLength(Math.min(FAN_MAX, fanCapacity(width)));
      expect(hand.length).toBeLessThanOrEqual(FAN_MAX);
      expect(hand[0]?.id).toBe("c0");
    }
  });

  it("a short deck is dealt whole, never padded to capacity", () => {
    const cards = [card("a"), card("b")];
    expect(fanCards(cards, 448)).toHaveLength(2);
  });
});

describe("the words on the cards", () => {
  it("a composed reaction card goes by its setup", () => {
    const composed = card("x", {
      sides: { setup: "Grignard", conditions: "Et2O", product: "an alcohol" },
    });
    expect(trayTitle(composed)).toBe("Grignard");
  });

  it("the committed image's own names survive uncut", () => {
    // Every name the reference draws fits the strip. If FAN_NAME_STRIP ever
    // drops below what these need, the fan stops being able to render the
    // very image it is built from.
    for (const name of ["Grignard", "SN2", "Diels-Alder", "Williamson", "Ozonolysis", "Wittig"]) {
      expect(trayTitle(card("n", { front: name }))).toBe(name);
      expect(nameWidthPx(name)).toBeLessThanOrEqual(FAN_NAME_STRIP);
    }
  });

  it("NO title paints wider than the strip, whatever it is made of", () => {
    // The property the character cap could not hold: at 12px bold "i" is
    // 3.42px and "W" is 12.06px, so eleven characters is anything from 38px
    // to 133px. These are the widths that broke it.
    const fronts = [
      "WWWWWWWWWWWWWWWWWWWW",
      "mmmmmmmmmmmmmmmmmmmm",
      "iiiiiiiiiiiiiiiiiiii",
      "cyclopentene + NBS",
      "Which carbon does the nucleophile hit?",
      "Baeyer-Villiger oxidation",
      "1,2-hydride shift to a tertiary cation",
      "………………",
      "Müller-Rochow direct process",
      "",
    ];
    for (const front of fronts) {
      const title = trayTitle(card("t", { front }));
      expect(nameWidthPx(title)).toBeLessThanOrEqual(FAN_NAME_STRIP + 1e-9);
    }
  });

  it("a cut title still ends in an ellipsis and keeps real words", () => {
    // A boundary past half the budget wins: "Which carbon does..." keeps the
    // whole first word rather than stopping mid "carbon".
    expect(trayTitle(card("y"))).toBe("Which…");
    expect(trayTitle(card("w", { front: "Grignard addition" }))).toBe("Grignard…");
    // A single long word is cut mid-word rather than thrown away entirely.
    const long = trayTitle(card("l", { front: "cyclopentadienyl" }));
    expect(long.endsWith("…")).toBe(true);
    expect(long.length).toBeGreaterThan(4);
  });

  it("a short name is left exactly as written", () => {
    expect(trayTitle(card("z", { front: "SN2" }))).toBe("SN2");
  });

  it("the tray label is the committed image's shape: count, dot, name", () => {
    expect(trayLabel(24, "Reaction Deck")).toBe("24 · Reaction Deck");
  });
});

describe("THE BOX: the deck stands IN the tray, not on it", () => {
  /**
   * The round 3 defect, pinned in arithmetic. The critic measured it at 4x on
   * the running build: "the cream stack is painted IN FRONT of the front
   * panel, and its bottom edge is a large convex bulge that hangs down over
   * the violet, so it reads as a cream slab lying on top of a purple box
   * rather than cards in a box."
   *
   * Standing IN the box is a geometric claim and these are its terms: every
   * card's foot is below the front panel's shoulder, so the panel covers it;
   * every card is inside the cavity's own walls; and the front card shows a
   * little under half of itself, which is the image's proportion.
   */
  it("every card's foot is hidden behind the front panel", () => {
    for (let i = 0; i < 6; i += 1) {
      const box = trayCard(i);
      expect(box.y + box.h).toBeGreaterThan(TRAY_ART.shoulder);
      expect(box.y + box.h).toBeGreaterThan(TRAY_ART.notchBottom);
    }
  });

  it("every card stands between the box's inner walls", () => {
    for (let i = 0; i < 6; i += 1) {
      const box = trayCard(i);
      expect(box.x).toBeGreaterThanOrEqual(TRAY_ART.wall);
      expect(box.x + box.w).toBeLessThanOrEqual(TRAY_ART.width - TRAY_ART.wall);
    }
  });

  it("the deck climbs out of the box: each card behind is higher and narrower", () => {
    for (let i = 1; i < 6; i += 1) {
      expect(trayCard(i).y).toBeLessThan(trayCard(i - 1).y);
      expect(trayCard(i).w).toBeLessThan(trayCard(i - 1).w);
    }
    // And the whole deck stays inside the drawing.
    expect(trayCard(5).y).toBeGreaterThanOrEqual(0);
  });

  it("only the front card's upper half shows above the rim", () => {
    // "Only the cards' upper 40 percent shows above the rim." 85 of 188 is
    // 45 percent; the bound is a band rather than a point because the number
    // is read off a drawing, not published by one.
    const exposure = trayDeckExposure();
    expect(exposure).toBeGreaterThan(0.35);
    expect(exposure).toBeLessThan(0.5);
  });

  it("the notch is a DIP in the panel, not a hole through the box", () => {
    // The ellipse mask is gone. What is left has to be a shallow, centred,
    // flat-bottomed scoop that never reaches the panel's foot.
    expect(TRAY_ART.notchBottom).toBeGreaterThan(TRAY_ART.shoulder);
    expect(TRAY_ART.notchBottom).toBeLessThan(TRAY_ART.boxFoot);
    expect(TRAY_ART.notchLeft).toBeLessThan(TRAY_ART.notchRight);
    expect(TRAY_ART.notchShoulderLeft).toBeLessThan(TRAY_ART.notchLeft);
    expect(TRAY_ART.notchShoulderRight).toBeGreaterThan(TRAY_ART.notchRight);
    // Centred, so the dip reads as a thumb notch and not as a bite.
    const centre = (TRAY_ART.notchLeft + TRAY_ART.notchRight) / 2;
    expect(Math.abs(centre - TRAY_ART.width / 2)).toBeLessThan(8);
    // The image's dip is about 40 percent of the tray wide.
    const share = (TRAY_ART.notchRight - TRAY_ART.notchLeft) / TRAY_ART.width;
    expect(share).toBeGreaterThan(0.32);
    expect(share).toBeLessThan(0.48);
  });
});
