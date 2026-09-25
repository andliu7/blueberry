/**
 * A molecular formula, with the digits set as subscripts.
 *
 * RDKit hands back a flat string like `C4H8O2`, and printing that as-is next to
 * a name reads as a part number. Splitting on digit runs is safe here because a
 * formula is only ever element symbols and counts, and charges arrive as a
 * trailing `+`/`-` which is left alone.
 *
 * Renders nothing when there is no formula. `formula_of` returns an empty
 * string for anything RDKit will not parse, so a gap in the data shows as a
 * missing line rather than as a confident wrong one.
 *
 * Its own file, moved out of reaction-panel.tsx, because the reaction card in
 * src/game prints the same formula under the same drawing and must print it
 * the same way. Importing the panel for it would pull the panel's button,
 * input and course-override imports into the game bundle. `className` sets
 * the ink only; the shape (a block under the name, mono, small) is fixed so
 * the two surfaces cannot drift apart.
 */
export function Formulas({
  list,
  join = " + ",
  className = "text-slate-600 dark:text-stone-300",
}: {
  list?: readonly string[];
  join?: string;
  className?: string;
}) {
  const shown = (list ?? []).filter(Boolean);
  if (!shown.length) return null;

  return (
    <span className={`mt-0.5 block font-mono text-xs font-normal ${className}`}>
      {shown.map((f, i) => (
        <span key={`${f}-${i}`}>
          {i > 0 && join}
          {f.split(/(\d+)/).map((part, j) =>
            /^\d+$/.test(part) ? <sub key={j}>{part}</sub> : <span key={j}>{part}</span>,
          )}
        </span>
      ))}
    </span>
  );
}
