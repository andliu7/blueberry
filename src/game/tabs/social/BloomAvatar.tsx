/**
 * Bloom's face for the social tabs (Messages rows and thread header, the Ask
 * chat). One component so the character looks the same everywhere.
 *
 * The berry is now a deep navy blue (owner, 2026-10-16), so it sits on a pale
 * periwinkle disc with a white ring: on the old lavender or navy disc it read
 * as a muddy dark blob at 30 to 40px.
 */

import { BlueberryMark } from "../../mascot/BlueberryMark";

const SIZES = { sm: "size-9", md: "size-11", lg: "size-12", xl: "size-24" } as const;

export function BloomAvatar({ size = "md" }: { readonly size?: keyof typeof SIZES }) {
  return (
    <span
      className={`${SIZES[size]} grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#e3e8ff] ring-2 ring-white`}
      aria-hidden="true"
    >
      <BlueberryMark eyes mood="happy" className="h-[86%] w-[86%] translate-y-[5%]" />
    </span>
  );
}
