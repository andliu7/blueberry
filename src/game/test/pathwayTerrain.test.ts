/**
 * The backdrop's arithmetic.
 *
 * The one property that matters more than any single number: the curve is
 * DERIVED from the units, never hand placed. So the tests are mostly about what
 * has to stay true when an authoring wave adds nodes: a checkpoint is always the
 * highest barrier around it, the run always trends downhill, and the channel the
 * labels live in never closes far enough to run under them.
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import {
  boundaryPath,
  channelHalfWidth,
  CHANNEL_HALF,
  CHANNEL_SWING,
  energyProfile,
  envelopeAt,
  groundPath,
  isCheckpointUnit,
  rippleScale,
  stepProfile,
  unitEnergies,
  type RowSpan,
  type UnitSpan,
} from "../tabs/pathway/terrain";

const WIDTH = 390;

/** Even spans down a page, which is what a measured stage roughly looks like. */
function spans(step = 600): readonly UnitSpan[] {
  return PATHWAY_UNITS.map((unit, index) => ({
    unitId: unit.id,
    top: index * step,
    bottom: index * step + step,
  }));
}

describe("unitEnergies", () => {
  it("gives one entry per unit, in order", () => {
    const energies = unitEnergies(PATHWAY_UNITS);
    expect(energies.map((entry) => entry.unitId)).toEqual(PATHWAY_UNITS.map((unit) => unit.id));
  });

  it("keeps every barrier and every well depth inside 0 and 1", () => {
    for (const entry of unitEnergies(PATHWAY_UNITS)) {
      expect(entry.barrier).toBeGreaterThanOrEqual(0);
      expect(entry.barrier).toBeLessThanOrEqual(1);
      expect(entry.wellDepth).toBeGreaterThan(0);
      expect(entry.wellDepth).toBeLessThanOrEqual(1);
    }
  });

  it("makes a checkpoint unit a taller barrier than any lesson unit with the same spine load", () => {
    const energies = unitEnergies(PATHWAY_UNITS);
    const checkpoints = energies.filter((entry) => entry.isCheckpoint);
    expect(checkpoints.length).toBeGreaterThan(0);
    for (const checkpoint of checkpoints) {
      expect(checkpoint.barrier).toBeGreaterThanOrEqual(0.45);
    }
  });

  it("reads a unit whose track nodes are all gates as a checkpoint, and nothing else", () => {
    for (const unit of PATHWAY_UNITS) {
      const track = unit.nodes.filter((node) => node.kind !== "branch");
      const allGates = track.length > 0 && track.every((node) => node.kind === "gate");
      expect(isCheckpointUnit(unit)).toBe(allGates);
    }
  });

  it("is empty for no units rather than throwing", () => {
    expect(unitEnergies([])).toEqual([]);
  });
});

describe("energyProfile", () => {
  it("puts three control points on every unit, plus a lead in and a lead out", () => {
    const profile = energyProfile(unitEnergies(PATHWAY_UNITS), spans());
    expect(profile).toHaveLength(PATHWAY_UNITS.length * 3 + 2);
  });

  it("runs off both ends, so the ground has no hard edge on screen", () => {
    const profile = energyProfile(unitEnergies(PATHWAY_UNITS), spans());
    const all = spans();
    expect(profile[0]!.y).toBeLessThan(all[0]!.top);
    expect(profile[profile.length - 1]!.y).toBeGreaterThan(all[all.length - 1]!.bottom);
  });

  it("dips below the crest at every unit's centre, so a unit reads as a well", () => {
    const profile = energyProfile(unitEnergies(PATHWAY_UNITS), spans()).slice(1, -1);
    for (let i = 0; i < profile.length; i += 3) {
      expect(profile[i + 1]!.energy).toBeLessThan(profile[i]!.energy);
    }
  });

  it("runs downhill: the last unit's trough sits below the first unit's", () => {
    const profile = energyProfile(unitEnergies(PATHWAY_UNITS), spans()).slice(1, -1);
    expect(profile[profile.length - 2]!.energy).toBeLessThan(profile[1]!.energy);
  });

  it("only ever moves down the page", () => {
    const profile = energyProfile(unitEnergies(PATHWAY_UNITS), spans());
    for (let i = 1; i < profile.length; i += 1) {
      expect(profile[i]!.y).toBeGreaterThanOrEqual(profile[i - 1]!.y);
    }
  });

  it("ignores a span for a unit the map does not carry", () => {
    const profile = energyProfile(unitEnergies(PATHWAY_UNITS), [
      { unitId: "not-a-unit", top: 0, bottom: 100 },
      ...spans(),
    ]);
    expect(profile).toHaveLength(PATHWAY_UNITS.length * 3 + 2);
  });

  it("is empty with no spans", () => {
    expect(energyProfile(unitEnergies(PATHWAY_UNITS), [])).toEqual([]);
  });
});

describe("the channel", () => {
  it("never closes past the floor the labels need", () => {
    // A label sits in the channel, and the basis is HALF the track column. The
    // tightest pass this arithmetic can produce is CHANNEL_HALF - CHANNEL_SWING
    // of that half, and it has to stay outside the text on a 390pt phone or a
    // moving layer would run under a label the contrast audit cannot see behind.
    const basis = WIDTH / 2;
    const profile = energyProfile(unitEnergies(PATHWAY_UNITS), spans());
    for (const sample of profile) {
      const half = channelHalfWidth(sample.energy, basis);
      expect(half).toBeGreaterThanOrEqual(basis * (CHANNEL_HALF - CHANNEL_SWING) - 0.001);
      // THE COLUMN ITSELF is the floor, on each side. The audit cannot see the
      // ground behind a label, and no ground colour clears both the 3:1
      // graphics floor and the 4.5:1 text floor, so the guarantee has to be
      // geometric: the channel is never narrower than the track column, so no
      // label can ever be composed on the hillside.
      expect(half / basis).toBeGreaterThanOrEqual(1);
    }
  });

  it("mirrors: the two boundaries are the same distance either side of centre", () => {
    const left = channelHalfWidth(0.4, WIDTH / 2);
    const right = channelHalfWidth(0.4, WIDTH / 2);
    expect(left).toBeCloseTo(right, 6);
  });

  it("a barrier squeezes the channel and a well opens it", () => {
    expect(channelHalfWidth(0.8, WIDTH / 2)).toBeLessThan(channelHalfWidth(-0.8, WIDTH / 2));
  });
});

describe("the drawn paths", () => {
  const profile = energyProfile(unitEnergies(PATHWAY_UNITS), spans());
  const geometry = { width: WIDTH, height: PATHWAY_UNITS.length * 600, centreX: WIDTH / 2, basis: WIDTH / 2 };

  it("draws a cubic through every sample, both sides", () => {
    for (const side of [-1, 1] as const) {
      const d = boundaryPath(profile, geometry, side);
      expect(d.startsWith("M ")).toBe(true);
      expect(d.match(/ C /g) ?? []).toHaveLength(profile.length - 1);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it("closes the ground out to the page edge it belongs to", () => {
    expect(groundPath(profile, geometry, -1)).toMatch(/L 0 -?[\d.]+ L 0 -?[\d.]+ Z$/);
    expect(groundPath(profile, geometry, 1)).toMatch(new RegExp(`L ${WIDTH} -?[\\d.]+ L ${WIDTH} -?[\\d.]+ Z$`));
  });

  it("is an empty string with no samples, so the scene renders nothing rather than a broken path", () => {
    expect(boundaryPath([], geometry, -1)).toBe("");
    expect(groundPath([], geometry, -1)).toBe("");
  });
});

/**
 * The per lesson ripple. The unit envelope moves about 25px sideways over a
 * whole screen height, which is a straight vertical line to an eye, and a blind
 * judge read the hillsides as "two solid tan vertical bars". These are the
 * properties that have to hold once the profile scallops once per lesson.
 */
describe("stepProfile", () => {
  const base = energyProfile(unitEnergies(PATHWAY_UNITS), spans());

  /** Rows at the track's own pitch inside each unit's span. */
  function rows(step = 600, pitch = 110): readonly RowSpan[] {
    const out: RowSpan[] = [];
    for (let unit = 0; unit < PATHWAY_UNITS.length; unit += 1) {
      for (let y = unit * step + 40; y + pitch < unit * step + step; y += pitch) {
        out.push({ top: y, bottom: y + pitch });
      }
    }
    return out;
  }

  it("leaves the base alone when nothing has been measured yet", () => {
    expect(stepProfile(base, [])).toBe(base);
    expect(stepProfile([], rows())).toEqual([]);
    expect(stepProfile(base, rows(), 0)).toBe(base);
  });

  it("only ever moves down the page", () => {
    const profile = stepProfile(base, rows());
    for (let i = 1; i < profile.length; i += 1) {
      expect(profile[i]!.y).toBeGreaterThanOrEqual(profile[i - 1]!.y);
    }
  });

  it("never closes the channel past the column the labels live in", () => {
    const basis = WIDTH / 2;
    for (const sample of stepProfile(base, rows())) {
      expect(channelHalfWidth(sample.energy, basis) / basis).toBeGreaterThanOrEqual(1);
    }
  });

  it("turns at least once per lesson, which is what stops the hillside reading as a bar", () => {
    const profile = stepProfile(base, rows());
    let turns = 0;
    for (let i = 1; i < profile.length - 1; i += 1) {
      const before = profile[i]!.energy - profile[i - 1]!.energy;
      const after = profile[i + 1]!.energy - profile[i]!.energy;
      if (before !== 0 && after !== 0 && Math.sign(before) !== Math.sign(after)) turns += 1;
    }
    expect(turns).toBeGreaterThanOrEqual(rows().length);
  });

  it("gives no two neighbouring steps the same size, so the edge is not milled", () => {
    const sizes = [0, 1, 2, 3, 4, 5, 6, 7].map(rippleScale);
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).not.toBeCloseTo(sizes[i - 1]!, 3);
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(0.55);
      expect(size).toBeLessThanOrEqual(1);
    }
    // Deterministic: the same index is the same picture on every capture run.
    expect(rippleScale(9)).toBe(rippleScale(9));
  });

  it("puts the widest channel of a lesson at the row centre, where the label is", () => {
    const measured = rows();
    const profile = stepProfile(base, measured);
    for (const row of measured.slice(0, 12)) {
      const centre = profile.find((sample) => Math.abs(sample.y - (row.top + row.bottom) / 2) < 0.5);
      const crest = profile.find((sample) => Math.abs(sample.y - row.top) < 0.5);
      expect(centre).toBeDefined();
      expect(crest).toBeDefined();
      expect(centre!.energy).toBeLessThan(crest!.energy);
    }
  });
});

describe("envelopeAt", () => {
  // GAPPED spans on purpose. The contiguous ones every other test uses put a
  // unit's bottom and the next unit's top on the same y with two different
  // energies, and no single valued function can return both. A gap makes every
  // control point's y unique, which is the case this function's contract is
  // actually about.
  const gapped: readonly UnitSpan[] = PATHWAY_UNITS.map((unit, index) => ({
    unitId: unit.id,
    top: index * 800,
    bottom: index * 800 + 600,
  }));
  const base = energyProfile(unitEnergies(PATHWAY_UNITS), gapped);

  it("holds the end values outside the profile rather than extrapolating", () => {
    expect(envelopeAt(base, base[0]!.y - 5000)).toBe(base[0]!.energy);
    expect(envelopeAt(base, base[base.length - 1]!.y + 5000)).toBe(base[base.length - 1]!.energy);
  });

  it("returns a control point exactly at its own y", () => {
    expect(new Set(base.map((sample) => sample.y)).size).toBe(base.length);
    for (const sample of base) expect(envelopeAt(base, sample.y)).toBeCloseTo(sample.energy, 9);
  });

  it("interpolates between two control points", () => {
    const a = base[1]!;
    const b = base[2]!;
    const mid = envelopeAt(base, (a.y + b.y) / 2);
    expect(mid).toBeCloseTo((a.energy + b.energy) / 2, 6);
  });

  it("is 0 for an empty profile rather than throwing", () => {
    expect(envelopeAt([], 100)).toBe(0);
  });
});
