/**
 * The backdrop, as arithmetic. Pure: no React, no DOM, no measurement.
 *
 * THE MOTIF IS CHEMISTRY AND NOT DECORATION. Owner direction 2026-08-28: the
 * path descends as you scroll, and the backdrop is designed to match the flow
 * of the lessons. A reaction coordinate diagram runs downhill, so a descending
 * path is the reaction proceeding, and downhill agrees with the only gesture a
 * phone user makes without thinking. Units are WELLS the path settles into. A
 * checkpoint unit is the HUMP between two wells, which is literally the
 * activation barrier, and a student scrolls past that shape every time.
 *
 * THE AXES, because a rotated diagram confuses people if it is not stated. The
 * reaction coordinate runs DOWN the page: scrolling is progress. Energy runs
 * ACROSS it. The ground is the low energy region, so it fills the two edges of
 * the page and its boundary is the energy curve. A barrier squeezes the channel
 * the path runs through; a well opens it into a basin. Both edges carry the
 * same curve mirrored, so the composition stays centred on a 390pt phone
 * instead of listing to one side.
 *
 * EVERY NUMBER COMES FROM THE UNIT'S OWN DATA. Nothing here is hand placed per
 * screen, because a hand drawn curve becomes a lie the moment the content
 * behind it moves, and the map gains nodes every authoring wave:
 *
 *   barrier    what it costs to ENTER the unit. Its share of the track's spine
 *              work, plus a fixed premium when the unit is a checkpoint, because
 *              a checkpoint IS the barrier rather than a lesson.
 *   wellDepth  how far the path settles once inside. Its share of the whole
 *              inventory, spine and branches together, because "how much it
 *              unlocks" is how much of the map hangs off it.
 *   drift      the overall exergonic slope. Every unit sits a little lower than
 *              the one before it, so the run reads as downhill end to end and
 *              not as a row of identical bumps.
 */

import type { PathwayUnit } from "../../demo/pathwayMap";

export interface UnitEnergy {
  readonly unitId: string;
  /** 0..1. The crest between this unit and the one before it. */
  readonly barrier: number;
  /** 0..1. How far the channel opens at the unit's centre. */
  readonly wellDepth: number;
  /** Every node in it is a gate: this unit is a checkpoint, not a lesson set. */
  readonly isCheckpoint: boolean;
}

/** A checkpoint unit is one whose track nodes are all gates. */
export function isCheckpointUnit(unit: PathwayUnit): boolean {
  const track = unit.nodes.filter((node) => node.kind !== "branch");
  return track.length > 0 && track.every((node) => node.kind === "gate");
}

/** The premium a checkpoint adds to its own barrier. A quiz is the wall. */
const CHECKPOINT_PREMIUM = 0.45;

export function unitEnergies(units: readonly PathwayUnit[]): readonly UnitEnergy[] {
  if (units.length === 0) return [];
  const spine = units.map((unit) => unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss").length);
  const inventory = units.map((unit) => unit.nodes.length);
  const maxSpine = Math.max(1, ...spine);
  const maxInventory = Math.max(1, ...inventory);
  return units.map((unit, index) => {
    const checkpoint = isCheckpointUnit(unit);
    const barrier = Math.min(1, (spine[index]! / maxSpine) * 0.6 + (checkpoint ? CHECKPOINT_PREMIUM : 0));
    return {
      unitId: unit.id,
      barrier,
      wellDepth: inventory[index]! / maxInventory,
      isCheckpoint: checkpoint,
    };
  });
}

/** Where one unit sits in the scroller, measured off the built page. */
export interface UnitSpan {
  readonly unitId: string;
  /** Top and bottom of the unit's section, in scene coordinates. */
  readonly top: number;
  readonly bottom: number;
}

export interface TerrainGeometry {
  /** The scene's own box, which is the VIEWPORT and not the whole track. */
  readonly width: number;
  readonly height: number;
  /** Where the track's centreline sits inside that box. */
  readonly centreX: number;
  /**
   * The half width the channel is measured against, in pixels.
   *
   * Not simply half the scene, because the scene is full bleed: on a 2560px
   * monitor a fraction of the viewport would push the hillsides off the sides of
   * the world. The caller caps it, so the landscape stays the same shape on a
   * phone and on a desktop and only the amount of open ground either side grows.
   */
  readonly basis: number;
  /**
   * How far past the basis the channel may swell at zero energy, in pixels.
   *
   * It is a PIXEL budget rather than a fraction of the basis because the two
   * numbers answer to different things. The basis answers to the label column:
   * it is half of it, and the channel is never narrower, or body copy ends up on
   * the ground this file's header says it must never sit on. The swing answers
   * to the viewport: it is whatever room is left between the paper and the
   * screen edge, so the widest crest still has ground beside it. On a desktop
   * that room is plentiful and the swing is the old 16 percent of the basis; on
   * a 390pt phone it is a few pixels, and a few pixels is the honest answer
   * there, because a phone has no room for both a full width reading column and
   * a landscape beside it.
   *
   * Optional so a caller that only cares about the shape, including this
   * package's own tests, gets the 16 percent by default and nothing about their
   * arithmetic moves.
   */
  readonly swingPx?: number;
}

/**
 * The channel half-width at rest, and how far energy is allowed to move it, as
 * fractions of the scene width.
 *
 * THE FLOOR IS A CONTRAST RULE AND IT IS ARITHMETIC, NOT TASTE.
 *
 * Node labels live in the channel, and the contrast audit CANNOT SEE the ground
 * behind them: an SVG mark under a text box is not that box's CSS ancestor, so
 * the climb reports the page and the pair is measured against a surface the
 * reader is not looking at. That makes this the one place a moving layer could
 * quietly break a pair the audit reports as passing, so the geometry has to
 * guarantee it instead.
 *
 * And there is no colour that dodges it. The ground must clear 3:1 against the
 * page as a graphical object, which caps its lightness at about 0.25; body text
 * must clear 4.5:1 on whatever it sits on, which needs at least 0.28. No value
 * satisfies both, so text simply must not sit on the ground.
 *
 * The basis is HALF THE TRACK COLUMN, so CHANNEL_HALF at 1.16 means the channel
 * is never narrower than the column itself even at the tightest barrier
 * (1.16 - 0.16 = 1.00). The hillsides therefore start at the column's own edge
 * and grow outward: a real valley on a desktop, where the viewport is far wider
 * than the column, and two warm edges on a 390pt phone, where there is
 * genuinely no room beside the text and pretending otherwise would put body
 * copy on a 3.3:1 ground.
 */
export const CHANNEL_HALF = 1.16;
export const CHANNEL_SWING = 0.16;
/**
 * The highest total energy the channel may ever carry.
 *
 * It is the floor rule solved for energy rather than a second number to keep in
 * step: at this value `channelHalfWidth` returns exactly the basis, which is
 * half the track column, so a label is still inside the channel. Anything the
 * profile adds on top of a unit's own crest is capped against this, and that is
 * why the ripple below cannot walk a hillside under a label.
 */
export const ENERGY_CEILING = (CHANNEL_HALF - 1) / CHANNEL_SWING;
/**
 * How far the terrain runs past the first and last unit.
 *
 * Without it the ground has a hard horizontal top edge exactly where the first
 * unit begins, which reads as a rectangle someone dropped on the page rather
 * than as a hillside the path runs through. A landscape has no beginning on
 * screen, so the profile is extended off both ends.
 */
export const LEAD_PX = 1400;
/** The whole run drops this far in energy from first unit to last. */
export const EXERGONIC_DRIFT = 0.35;

export interface TerrainSample {
  readonly y: number;
  /** Signed energy, positive is a barrier and negative is a well. */
  readonly energy: number;
}

/**
 * The energy profile as a list of samples down the page.
 *
 * Three control points per unit: the crest at its top edge, the trough at its
 * centre, and the climb back out at its bottom edge. Between them the caller
 * draws a smooth curve, so the shape is entirely determined by the data and by
 * where the units actually landed.
 */
export function energyProfile(
  energies: readonly UnitEnergy[],
  spans: readonly UnitSpan[],
): readonly TerrainSample[] {
  const byId = new Map(energies.map((entry) => [entry.unitId, entry]));
  const ordered = spans.filter((span) => byId.has(span.unitId));
  if (ordered.length === 0) return [];
  const last = ordered.length - 1;
  const samples: TerrainSample[] = [];
  const firstEnergy = byId.get(ordered[0]!.unitId)!;
  samples.push({ y: ordered[0]!.top - LEAD_PX, energy: firstEnergy.barrier });
  ordered.forEach((span, index) => {
    const energy = byId.get(span.unitId)!;
    // Downhill: each unit's whole shape sits lower than the one before it.
    const drift = last === 0 ? 0 : (index / last) * EXERGONIC_DRIFT;
    const crest = energy.barrier - drift;
    const trough = -energy.wellDepth - drift;
    samples.push({ y: span.top, energy: crest });
    samples.push({ y: (span.top + span.bottom) / 2, energy: trough });
    samples.push({ y: span.bottom, energy: crest * 0.55 - drift * 0.5 });
  });
  const tail = samples[samples.length - 1]!;
  samples.push({ y: ordered[last]!.bottom + LEAD_PX, energy: tail.energy });
  return samples;
}

/* -------------------------------------------------------------------------- */
/* The per lesson ripple, and the defect it exists to fix.                      */
/* -------------------------------------------------------------------------- */

/**
 * A blind judge read the landscape on a phone as "two solid tan vertical bars
 * with no rounding, label or content", and that reading was correct arithmetic
 * rather than a matter of taste. The unit profile above puts three control
 * points on a unit, and a unit is 1200 to 2500 pixels tall, so the boundary
 * moves about 25 pixels sideways over a whole screen height. A line that
 * deviates 25px over 850px is a straight vertical line to an eye.
 *
 * The fix is not a bigger swing, because the floor rule caps that: the channel
 * may never be narrower than the track column or a label ends up composed on
 * the ground, where the contrast audit cannot see the pair. The fix is a
 * shorter WAVELENGTH, and the data already has one.
 *
 * A multi step reaction coordinate does not run from one well to the next in a
 * single arc. Every step has its own barrier and its own intermediate, and on
 * this track every step is a lesson. So each spine row contributes a small
 * crest at its top edge and a small trough at its centre: the hillside now
 * scallops once per lesson, at the track's own pitch of roughly 110px, which is
 * six or seven turns per screen instead of none. The bars stop reading as bars
 * because they stop being straight, and what makes them bend is the lesson
 * list, which is the same rule the rest of this file follows.
 */
export const STEP_RIPPLE = 0.34;

/**
 * How much of a step's ripple survives, per row.
 *
 * A ripple of one constant size at one constant pitch is not a landform, it is
 * a milled edge, and the first build of this read exactly that way on a desktop:
 * a 300px hillside with a perfectly repeating scallop down both sides, mirrored,
 * looks like clip art of a canyon rather than a canyon. Real steps are not the
 * same size as each other.
 *
 * The multiplier is the golden ratio sequence, which is the standard way to get
 * a spread with no visible period: successive values never repeat and never
 * clump, and index i always gives the same value, so a capture of the third
 * unit is the same picture every run. Nothing here is random.
 */
const GOLDEN = 0.6180339887498949;
export function rippleScale(index: number): number {
  const fraction = (index * GOLDEN) % 1;
  return 0.55 + 0.45 * fraction;
}

/** One track row's box in scene coordinates. */
export interface RowSpan {
  readonly top: number;
  readonly bottom: number;
}

/**
 * The base profile read at an arbitrary y, by linear interpolation.
 *
 * Linear and not the drawn cubic on purpose: this is the ENVELOPE the ripple is
 * hung off, and a straight chord between two control points is close enough to
 * the drawn curve at the scale a 110px ripple cares about, while being cheap
 * and having no turning points of its own to fight.
 */
export function envelopeAt(samples: readonly TerrainSample[], y: number): number {
  if (samples.length === 0) return 0;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  if (y <= first.y) return first.energy;
  if (y >= last.y) return last.energy;
  for (let i = 1; i < samples.length; i += 1) {
    const to = samples[i]!;
    if (to.y < y) continue;
    const from = samples[i - 1]!;
    const span = to.y - from.y;
    if (span <= 0) return to.energy;
    const t = (y - from.y) / span;
    return from.energy + (to.energy - from.energy) * t;
  }
  return last.energy;
}

/**
 * The unit envelope with one step's worth of ripple added per track row.
 *
 * Pure and total: no rows, or fewer than two base samples, returns the base
 * unchanged, so a page that has not measured yet draws exactly what it drew
 * before. The result stays sorted by y and never exceeds ENERGY_CEILING, which
 * is what keeps the floor rule true of the rippled profile and not only of the
 * envelope.
 */
export function stepProfile(
  base: readonly TerrainSample[],
  rows: readonly RowSpan[],
  amplitude: number = STEP_RIPPLE,
): readonly TerrainSample[] {
  if (base.length < 2 || rows.length === 0 || amplitude <= 0) return base;
  const added: TerrainSample[] = [];
  rows.forEach((row, index) => {
    const size = amplitude * rippleScale(index);
    const centre = (row.top + row.bottom) / 2;
    const crestBase = envelopeAt(base, row.top);
    // The upward half is scaled to whatever headroom the envelope leaves, so a
    // ripple on top of a checkpoint crest cannot push the channel under a label.
    const up = Math.min(size, Math.max(0, ENERGY_CEILING - crestBase));
    added.push({ y: row.top, energy: crestBase + up });
    added.push({ y: centre, energy: envelopeAt(base, centre) - size });
  });
  // One merge of two sorted lists. Samples sharing a y would draw a horizontal
  // step in the boundary, so the ripple wins the tie and the envelope's own
  // point is dropped.
  const merged = [...base, ...added].sort((a, b) => a.y - b.y);
  const out: TerrainSample[] = [];
  for (const sample of merged) {
    const previous = out[out.length - 1];
    if (previous !== undefined && Math.abs(previous.y - sample.y) < 0.5) {
      out[out.length - 1] = { y: previous.y, energy: Math.max(previous.energy, sample.energy) };
      continue;
    }
    out.push(sample);
  }
  return out;
}

/**
 * Energy to a distance from the centreline, in pixels, against a half width
 * basis.
 *
 * The floor is enforced HERE rather than left to the arithmetic of the two
 * constants. It was already true that CHANNEL_HALF minus CHANNEL_SWING is
 * exactly 1, so no unit energy in 0..1 could close the channel past the column;
 * once the profile gained a ripple, "no energy exceeds 1" stopped being
 * something a reader could check by looking at two constants. A clamp says it
 * once, at the only place a channel width is ever produced.
 */
export function channelHalfWidth(
  energy: number,
  basis: number,
  swingPx: number = basis * CHANNEL_SWING,
): number {
  // Identical to `basis * (CHANNEL_HALF - energy * CHANNEL_SWING)` at the default
  // swing, which is why no existing number moved when the swing became a
  // parameter: CHANNEL_HALF is 1 + CHANNEL_SWING by construction, so
  // basis + (1 - energy) * basis * CHANNEL_SWING is the same expression
  // rearranged. What the pixel form buys is a caller that can shrink the swell
  // without shrinking the floor, which the fraction form could not express.
  return Math.max(basis, basis + (1 - energy) * swingPx);
}

/**
 * A smooth vertical curve through the samples, as an SVG path.
 *
 * Cubic segments with vertical tangents, so every crest and trough is a real
 * turning point rather than a corner. `side` is -1 for the left boundary and
 * +1 for the right, which is the mirror that keeps the composition centred.
 */
export function boundaryPath(
  samples: readonly TerrainSample[],
  geometry: TerrainGeometry,
  side: -1 | 1,
): string {
  if (samples.length === 0) return "";
  const x = (sample: TerrainSample) => geometry.centreX + side * channelHalfWidth(sample.energy, geometry.basis, geometry.swingPx);
  let d = `M ${x(samples[0]!).toFixed(2)} ${samples[0]!.y.toFixed(2)}`;
  for (let i = 1; i < samples.length; i += 1) {
    const from = samples[i - 1]!;
    const to = samples[i]!;
    const grip = (to.y - from.y) / 2;
    d += ` C ${x(from).toFixed(2)} ${(from.y + grip).toFixed(2)}, ${x(to).toFixed(2)} ${(to.y - grip).toFixed(2)}, ${x(to).toFixed(2)} ${to.y.toFixed(2)}`;
  }
  return d;
}

/** The boundary closed out to the page edge, so the ground is a filled shape. */
/**
 * THE PAPER RIBBON: the channel itself, as one closed shape.
 *
 * The lavender turn made the page a ground and the card a warm cream, and the
 * pathway's channel is the same relationship at landscape scale: a strip of
 * paper the track is printed on, running down a lavender ground. So the channel
 * needs a FILL, which it never had: it used to be the gap between two hillsides.
 *
 * It is the left boundary walked down, a step across the bottom, and the right
 * boundary walked back up. Reversing a cubic segment is exact rather than
 * approximate: a segment P0 C1 C2 P3 run backwards is P3 C2 C1 P0, so the shape
 * closes on the same curve the boundary stroke draws and no seam can open
 * between the fill and its own edge.
 */
export function channelPath(
  samples: readonly TerrainSample[],
  geometry: TerrainGeometry,
): string {
  if (samples.length === 0) return "";
  const x = (sample: TerrainSample, side: -1 | 1) =>
    geometry.centreX + side * channelHalfWidth(sample.energy, geometry.basis, geometry.swingPx);
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  let d = `M ${x(first, -1).toFixed(2)} ${first.y.toFixed(2)}`;
  for (let i = 1; i < samples.length; i += 1) {
    const from = samples[i - 1]!;
    const to = samples[i]!;
    const grip = (to.y - from.y) / 2;
    d += ` C ${x(from, -1).toFixed(2)} ${(from.y + grip).toFixed(2)}, ${x(to, -1).toFixed(2)} ${(to.y - grip).toFixed(2)}, ${x(to, -1).toFixed(2)} ${to.y.toFixed(2)}`;
  }
  d += ` L ${x(last, 1).toFixed(2)} ${last.y.toFixed(2)}`;
  for (let i = samples.length - 1; i > 0; i -= 1) {
    const to = samples[i]!;
    const from = samples[i - 1]!;
    const grip = (to.y - from.y) / 2;
    d += ` C ${x(to, 1).toFixed(2)} ${(to.y - grip).toFixed(2)}, ${x(from, 1).toFixed(2)} ${(from.y + grip).toFixed(2)}, ${x(from, 1).toFixed(2)} ${from.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

export function groundPath(
  samples: readonly TerrainSample[],
  geometry: TerrainGeometry,
  side: -1 | 1,
): string {
  const boundary = boundaryPath(samples, geometry, side);
  if (boundary === "") return "";
  const edge = side === -1 ? 0 : geometry.width;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  return `${boundary} L ${edge} ${last.y.toFixed(2)} L ${edge} ${first.y.toFixed(2)} Z`;
}

/* -------------------------------------------------------------------------- */
/* The terraces: one continuous landscape, not one strip per unit.             */
/* -------------------------------------------------------------------------- */

/**
 * THE LADDER IS CONTINUOUS AND THE UNITS RIDE ON IT, owner 2026-09-04: "the
 * background is small and does not flow well ... each unit looks like a
 * separate strip rather than one continuous world scrolling past."
 *
 * The second half of that was arithmetic rather than taste. The first build
 * cut the plates PER UNIT: `count = round(unitHeight / 230)` and then
 * `step = unitHeight / count`, so the plate pitch was a different number in
 * every unit (a 1180px unit gave 236px plates, a 1390px unit gave 232px, a
 * short one gave 195px) and, worse, a plate edge landed EXACTLY on every unit
 * boundary by construction. A reader scrolling past unit 3 into unit 4 saw the
 * banner, a plate edge and a change of cadence arrive together, which is what
 * a strip is.
 *
 * So the ladder is laid once, down the whole track, at ONE pitch. A plate edge
 * lands on a unit boundary only by coincidence, the cadence never changes, and
 * a unit boundary is now nothing but a banner passing over land that carries
 * on. What still varies per unit is the SILHOUETTE each plate wears and which
 * props stand on it, which is the other half of the same owner note: crossing
 * into unit 4 should feel like somewhere new without anything being redrawn.
 *
 * The ladder runs past both ends of the track for the same reason LEAD_PX
 * exists: a landscape has no first plate on screen.
 */
export const TERRACE_BAND_PX = 230;
/** How many plates the ladder lays past the first and the last unit. */
export const TERRACE_LEAD_BANDS = 2;
/** How far past the viewport's sides and the band's own span the fill runs. */
export const TERRACE_BLEED_PX = 90;
/**
 * How far a plate's top edge rolls between its own crest and its own trough.
 *
 * Capped well under half the pitch on purpose: at more than that two
 * neighbouring edges cross, and an edge that climbs above the edge behind it
 * turns the stack of plates back into a set of overlapping shapes rather than
 * a terrace. 34 against a 230 pitch is about a seventh.
 */
export const TERRACE_RELIEF_PX = 34;
/** How far a plate's edge falls from one side of the page to the other. */
export const TERRACE_TILT_PX = 30;

/** One drawn terrace plate: where it starts, where it ends, which step it is. */
export interface TerraceBand {
  readonly key: string;
  readonly top: number;
  readonly bottom: number;
  /** 0..3, the value step. Adjacent bands are never the same. */
  readonly step: number;
  /** Its place on the ladder, counted from the lead-in plate. */
  readonly index: number;
  /** The unit whose character this plate wears. See terraceProfile. */
  readonly unitIndex: number;
}

/** Which unit a scene y falls in, clamped to the first and the last. */
export function unitIndexAt(
  spans: readonly { readonly top: number; readonly bottom: number }[],
  y: number,
): number {
  if (spans.length === 0) return 0;
  for (let i = 0; i < spans.length; i += 1) {
    if (y < spans[i]!.bottom) return i;
  }
  return spans.length - 1;
}

/**
 * The whole track's plates, laid at one pitch from before the first unit to
 * after the last.
 *
 * Pure and deterministic in its input, so the landscape is the same on every
 * render at a given scroll and nothing here calls Math.random.
 */
export function terraceBands(
  spans: readonly { readonly unitId: string; readonly top: number; readonly bottom: number }[],
  bandPx: number = TERRACE_BAND_PX,
): readonly TerraceBand[] {
  if (spans.length === 0) return [];
  const pitch = Math.max(1, bandPx);
  const first = spans[0]!;
  const last = spans[spans.length - 1]!;
  const start = first.top - TERRACE_LEAD_BANDS * pitch;
  const end = last.bottom + TERRACE_LEAD_BANDS * pitch;
  const count = Math.max(1, Math.ceil((end - start) / pitch));
  const bands: TerraceBand[] = [];
  for (let i = 0; i < count; i += 1) {
    const top = start + i * pitch;
    const bottom = top + pitch;
    bands.push({
      key: `terrace-${i}`,
      top,
      bottom,
      step: i % 4,
      index: i,
      unitIndex: unitIndexAt(spans, (top + bottom) / 2),
    });
  }
  return bands;
}

/**
 * The shape one plate's top edge takes.
 *
 * `crests` and `tilt` come from the UNIT, so every plate inside a unit shares
 * a skyline character and the character changes when the unit does. `phase`
 * and `relief` come from the plate's place on the LADDER, so no two edges sit
 * in register and the ridge line travels sideways as the page scrolls, which
 * is what a landscape passing a window looks like. Nothing here is random and
 * index i always gives the same edge.
 */
export interface TerraceProfile {
  /** How many crests the edge carries across the page. 1, 2 or 3. */
  readonly crests: number;
  /** How far it rolls, in pixels. */
  readonly relief: number;
  /** Where the wave starts, 0..1 of one crest. */
  readonly phase: number;
  /** Which way the land falls, -1 for left-low and 1 for right-low. */
  readonly tilt: number;
}

export function terraceProfile(unitIndex: number, bandIndex: number): TerraceProfile {
  // The golden sequence again: a spread with no visible period, and stable in
  // the index, which is what lets a capture of the third unit be the same
  // picture every run.
  const character = (unitIndex * GOLDEN) % 1;
  return {
    crests: 1 + Math.floor(character * 3),
    relief: TERRACE_RELIEF_PX * rippleScale(bandIndex + unitIndex),
    // The phase ADVANCES down the ladder rather than repeating: plate n + 1's
    // ridge sits a third of a crest along from plate n's, so the skyline walks
    // across the page as the reader scrolls instead of stacking in a column.
    phase: (bandIndex * 0.37) % 1,
    tilt: character < 0.5 ? -1 : 1,
  };
}

/**
 * One plate: a rolling top edge, and a body that runs past the page.
 *
 * The edge is a cosine of `crests` periods across the bleed width, plus a
 * steady fall from one side to the other, drawn as cubic Hermite segments with
 * the wave's OWN slope at every sample. Sampling the analytic tangent is what
 * keeps a two-crest edge smooth at four samples per crest instead of needing
 * twenty: the curve through the samples is the wave rather than an
 * approximation of it.
 *
 * It replaces a four-step staircase that always descended, alternating
 * direction by band. The staircase was the reason the plates read as strips
 * laid on the page rather than as land: a staircase has a first step and a
 * last step, and a hillside does not.
 */
export function terracePath(
  top: number,
  bottom: number,
  width: number,
  profile: TerraceProfile,
): string {
  const left = -TERRACE_BLEED_PX;
  const right = width + TERRACE_BLEED_PX;
  const span = Math.max(1, right - left);
  const relief = Math.max(0, profile.relief);
  const crests = Math.max(1, Math.round(profile.crests));
  const tilt = profile.tilt * TERRACE_TILT_PX;
  const at = (t: number) =>
    top + tilt * t + (relief / 2) * (1 - Math.cos(2 * Math.PI * (crests * t + profile.phase)));
  const slope = (t: number) =>
    tilt + relief * Math.PI * crests * Math.sin(2 * Math.PI * (crests * t + profile.phase));
  const samples = crests * 4;
  const step = 1 / samples;
  let d = `M ${left.toFixed(1)} ${at(0).toFixed(1)}`;
  for (let i = 1; i <= samples; i += 1) {
    const t0 = (i - 1) * step;
    const t1 = i * step;
    const x0 = left + span * t0;
    const x1 = left + span * t1;
    // Hermite to cubic: the control points sit a third of the segment along
    // the tangent at each end.
    const c1x = x0 + (span * step) / 3;
    const c1y = at(t0) + (slope(t0) * step) / 3;
    const c2x = x1 - (span * step) / 3;
    const c2y = at(t1) - (slope(t1) * step) / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x1.toFixed(1)} ${at(t1).toFixed(1)}`;
  }
  const floor = top + (bottom - top) + 600;
  d += ` L ${right.toFixed(1)} ${floor.toFixed(1)} L ${left.toFixed(1)} ${floor.toFixed(1)} Z`;
  return d;
}

/* -------------------------------------------------------------------------- */
/* The far ridge: the one thing that makes unit 4 look unlike unit 3.          */
/* -------------------------------------------------------------------------- */

/**
 * A broad rounded hill standing behind the plates, one per unit.
 *
 * blueberry_artkit-env-backdrop draws exactly this and the build had nothing
 * like it: a soft mountain silhouette rising above a terrace edge, with the
 * plates in front cutting it off at the waist. It is the cheapest possible
 * answer to "crossing from Unit 3 to Unit 4 should feel like somewhere new" -
 * the skyline is different, the prop family and the terrace language are
 * untouched, and one filled path per unit costs nothing to paint.
 *
 * WHY IT IS DRAWN BETWEEN TWO PLATES rather than behind all of them. Every
 * plate's body runs 600px past its own bottom, so at any y three plates cover
 * the ground and the LAST one drawn is the one a reader sees. A ridge drawn
 * before all of them would be covered by all of them. Drawn immediately after
 * the plate its apex stands in, it shows above the NEXT plate's edge and is
 * buried below it, which is the reference composition exactly.
 *
 * The apex is deliberately not centred: a hill on the axis of a track that
 * runs down the middle of the page is a hill nobody sees.
 */
export interface Ridge {
  readonly key: string;
  /** Scene y of the summit. The plate that contains it draws the ridge after itself. */
  readonly apexY: number;
  /** Centre and half width as fractions of the scene, so one number fits every device. */
  readonly centre: number;
  readonly halfWidth: number;
  readonly height: number;
}

/** How tall a far ridge stands, at the smallest and the largest. */
export const RIDGE_MIN_PX = 96;
export const RIDGE_MAX_PX = 178;

/**
 * One ridge per unit, placed from the unit's own span and its index.
 *
 * The apex sits in the middle two thirds of the unit rather than at its top,
 * so the hill and the unit banner are never the same horizontal line: a
 * silhouette that arrives with the banner reads as the banner's decoration,
 * which is the strip effect again.
 */
export function unitRidges(
  spans: readonly { readonly unitId: string; readonly top: number; readonly bottom: number }[],
): readonly Ridge[] {
  return spans.map((span, index) => {
    const a = (index * GOLDEN) % 1;
    const b = ((index + 1) * GOLDEN * 2) % 1;
    const height = Math.max(1, span.bottom - span.top);
    return {
      key: span.unitId,
      apexY: span.top + height * (0.34 + a * 0.34),
      // Off the axis, and on alternating flanks, so consecutive units put
      // their hill on opposite sides of the track.
      centre: index % 2 === 0 ? 0.2 + a * 0.18 : 0.62 + a * 0.18,
      halfWidth: 0.34 + b * 0.22,
      height: RIDGE_MIN_PX + b * (RIDGE_MAX_PX - RIDGE_MIN_PX),
    };
  });
}

/**
 * A ridge as a filled silhouette: two cubics up to the summit and down again,
 * then straight past the fold.
 *
 * Its skirts meet the horizon with a horizontal tangent, so the hill grows out
 * of the plate it stands on instead of being planted in it at an angle.
 */
export function ridgePath(ridge: Ridge, width: number): string {
  const centre = ridge.centre * width;
  const half = Math.max(40, ridge.halfWidth * width);
  const left = centre - half;
  const right = centre + half;
  const base = ridge.apexY + ridge.height;
  const apex = ridge.apexY;
  const floor = base + 900;
  return (
    `M ${left.toFixed(1)} ${base.toFixed(1)}` +
    ` C ${(left + half * 0.55).toFixed(1)} ${base.toFixed(1)}, ${(centre - half * 0.42).toFixed(1)} ${apex.toFixed(1)}, ${centre.toFixed(1)} ${apex.toFixed(1)}` +
    ` C ${(centre + half * 0.42).toFixed(1)} ${apex.toFixed(1)}, ${(right - half * 0.55).toFixed(1)} ${base.toFixed(1)}, ${right.toFixed(1)} ${base.toFixed(1)}` +
    ` L ${right.toFixed(1)} ${floor.toFixed(1)} L ${left.toFixed(1)} ${floor.toFixed(1)} Z`
  );
}
