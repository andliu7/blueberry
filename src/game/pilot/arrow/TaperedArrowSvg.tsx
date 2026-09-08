/**
 * The tapered curved arrow as an SVG element.
 *
 * This file is the ONLY one in the pair that knows about SVG. All the geometry
 * lives in taperedArrow.ts, which has no React and no DOM, so the shape can be
 * tested and measured without mounting anything.
 *
 * It renders a <g>, not an <svg>, so it drops into whichever canvas is already
 * on screen and inherits its coordinate space.
 *
 * NAMED TaperedArrowSvg, not TaperedArrow, and that is not a preference. This
 * repository is developed on Windows, whose filesystem is case insensitive, so
 * TaperedArrow.tsx and taperedArrow.ts differ only in casing: an extensionless
 * import of "./arrow/TaperedArrow" resolves to the .ts geometry module and the
 * component becomes unreachable, which tsc reports as TS1149 and TS1261. The
 * suffix follows render/svg/MoleculeSvg.tsx, which is already the convention
 * here for a component that is a thin SVG wrapper over a pure layout module.
 */

import { useId, useMemo } from "react";
import {
  DEFAULT_WIDTH_PROFILE,
  taperedArrowGeometry,
  type ArrowWidthProfile,
  type Point2,
  type TaperedArrowGeometry,
} from "./taperedArrow";

export interface TaperedArrowProps {
  readonly from: Point2;
  readonly to: Point2;
  /** The curve bows away from this, normally the scene centroid. */
  readonly away: Point2;
  readonly bowMagnitude?: number;
  readonly width?: Partial<ArrowWidthProfile>;
  readonly sinkRadiusPx?: number;
  /** Any CSS colour. Defaults to the identity violet in docs/DESIGN-TOKENS.md. */
  readonly fill?: string;
  /** The soft halo the design reference shows under the arrow. On by default. */
  readonly glow?: boolean;
  readonly opacity?: number;
  /**
   * Read by a screen reader. An arrow with no label is decoration, which is
   * the right default inside a canvas that already describes itself.
   */
  readonly label?: string;
}

export const ARROW_FILL = "#6d3fd4";

/**
 * The geometry, memoised on the values it actually depends on.
 *
 * useMemo here is not a micro-optimisation, it is what keeps the path string
 * stable across re-renders: the same object identity goes into the DOM, so a
 * canvas re-rendering for an unrelated reason does not hand SVG a fresh string
 * to re-parse mid animation.
 */
function useArrowGeometry(props: TaperedArrowProps): TaperedArrowGeometry {
  const { from, to, away, bowMagnitude, width, sinkRadiusPx } = props;
  const profile: ArrowWidthProfile = { ...DEFAULT_WIDTH_PROFILE, ...width };
  return useMemo(
    () =>
      taperedArrowGeometry({
        from: { x: from.x, y: from.y },
        to: { x: to.x, y: to.y },
        away: { x: away.x, y: away.y },
        bowMagnitude: bowMagnitude ?? 34,
        width: profile,
        sinkRadiusPx: sinkRadiusPx ?? 0,
      }),
    // Primitives only in the dependency list, so a caller passing a fresh
    // object literal every render does not defeat the memo.
    [
      from.x,
      from.y,
      to.x,
      to.y,
      away.x,
      away.y,
      bowMagnitude,
      sinkRadiusPx,
      profile.tailPx,
      profile.shoulderPx,
      profile.headPx,
      profile.headLengthPx,
    ],
  );
}

export function TaperedArrow(props: TaperedArrowProps) {
  const geometry = useArrowGeometry(props);
  // useId gives one stable id per mounted component, which is what keeps two
  // arrows on the same canvas from sharing a filter. The colons React puts in
  // it are legal in an id but awkward inside url(), so they come out.
  const uid = useId().replace(/:/g, "");
  const glow = props.glow ?? true;
  const fill = props.fill ?? ARROW_FILL;
  const filterId = `tapered-arrow-glow-${uid}`;

  // Nothing to draw is a real answer, not an error. See ArrowDegenerateCase.
  if (geometry.path === "") return null;

  return (
    <g
      role={props.label === undefined ? undefined : "img"}
      aria-label={props.label}
      aria-hidden={props.label === undefined ? true : undefined}
      opacity={props.opacity ?? 1}
    >
      {glow ? (
        <defs>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
      ) : null}
      {glow ? <path d={geometry.path} fill={fill} opacity={0.28} filter={`url(#${filterId})`} /> : null}
      <path d={geometry.path} fill={fill} />
    </g>
  );
}

export default TaperedArrow;
