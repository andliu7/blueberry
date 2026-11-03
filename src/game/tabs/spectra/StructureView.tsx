/** A molecule drawn from RDKit SVG, with rings on the atoms a picked NMR signal comes from. */
import "./spectra.css";

/** The molecule with rings round the atoms linked to the picked signals. */
export function StructureView({ compound, atoms }: { readonly compound: { readonly svg: string; readonly formula: string; readonly coords?: readonly (readonly [number, number])[] }; readonly atoms: readonly number[] }) {
  return (
    <div className="sp-struct" role="img" aria-label={`Structure of ${compound.formula}. ${atoms.length === 0 ? "No atoms ringed." : `${atoms.length} atom${atoms.length === 1 ? "" : "s"} ringed for the picked signal.`}`}>
      <div className="sp-struct-art" dangerouslySetInnerHTML={{ __html: compound.svg }} />
      <svg className="sp-struct-ring" viewBox="0 0 260 190" aria-hidden>
        {atoms.map((i) => {
          const c = compound.coords?.[i];
          return c === undefined ? null : <circle key={i} cx={c[0]} cy={c[1]} r={17} />;
        })}
      </svg>
    </div>
  );
}

