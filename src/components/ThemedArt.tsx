/**
 * An RDKit drawing in both themes. The curriculum build renders every structure twice,
 * dark ink for the day and light ink for the night (`art.start_light` and friends in
 * src/data/reactions.ts); this renders both and home.css shows the one that matches the
 * `dark` class. Paths are under BASE_URL, as the data says.
 *
 * `alt` is empty because every caller names the molecule in text beside the drawing.
 */
export function ThemedArt({ light, dark, className }: { light?: string; dark?: string; className?: string }) {
  const base = import.meta.env.BASE_URL;
  return (
    <span className={`themed-art ${className ?? ""}`}>
      {light && <img className="themed-art__light" src={base + light} alt="" draggable={false} />}
      {dark && <img className="themed-art__dark" src={base + dark} alt="" draggable={false} />}
    </span>
  );
}
