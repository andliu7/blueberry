/**
 * Card artwork for the testimonial fan, drawn as self-contained SVG data URIs.
 *
 * These ship inside the bundle rather than loading from an image host, so the
 * cards render offline, on GitHub Pages, and with no request that can 404 out
 * from under the layout. Each motif is lab equipment from this experiment, on a
 * muted indigo/slate wash that matches the app rather than competing with it.
 */

export type ArtMotif =
  | "erlenmeyer"
  | "benzene"
  | "reflux"
  | "sepfunnel"
  | "ir"
  | "nmr"
  | "attack"
  | "mascot";

const MOTIFS: Record<ArtMotif, string> = {
  // Erlenmeyer flask, part filled.
  erlenmeyer: `
    <path d="M100 66v52L60 226q-7 24 18 24h84q25 0 18-24l-40-108V66" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity=".92"/>
    <path d="M92 62h56" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".92"/>
    <path d="M79 190h82l11 36q7 24-18 24H86q-25 0-18-24z" fill="#fff" opacity=".3"/>
    <circle cx="104" cy="214" r="6" fill="#fff" opacity=".45"/>
    <circle cx="132" cy="228" r="4.5" fill="#fff" opacity=".4"/>
    <circle cx="118" cy="198" r="3.5" fill="#fff" opacity=".35"/>`,

  // Benzene ring with the classic inner circle.
  benzene: `
    <path d="M182 158 151 212 89 212 58 158 89 104 151 104Z" fill="none" stroke="#fff" stroke-width="5.5" stroke-linejoin="round" opacity=".92"/>
    <circle cx="120" cy="158" r="34" fill="none" stroke="#fff" stroke-width="4.5" opacity=".6"/>
    <path d="M151 104 168 74M58 158 26 158M151 212 168 242" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    <circle cx="172" cy="66" r="7" fill="#fff" opacity=".55"/>
    <circle cx="18" cy="158" r="7" fill="#fff" opacity=".55"/>`,

  // Round-bottom flask under a condenser.
  reflux: `
    <circle cx="120" cy="200" r="48" fill="none" stroke="#fff" stroke-width="5" opacity=".92"/>
    <path d="M120 152v-46" fill="none" stroke="#fff" stroke-width="5" opacity=".92"/>
    <path d="M104 106h32" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".92"/>
    <rect x="102" y="34" width="36" height="74" rx="9" fill="none" stroke="#fff" stroke-width="5" opacity=".92"/>
    <path d="M138 54q22 0 22 16M138 84q22 0 22-16" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".6"/>
    <path d="M84 214a36 36 0 0 0 72 0 36 36 0 0 1-72 0" fill="#fff" opacity=".28"/>
    <path d="M79 205a41 41 0 0 0 82 0z" fill="#fff" opacity=".28"/>`,

  // Separatory funnel showing two layers.
  sepfunnel: `
    <path d="M74 74h92l-38 104v54h-16v-54z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity=".92"/>
    <path d="M68 70h104" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".92"/>
    <path d="M87 122h66l-25 68h-16z" fill="#fff" opacity=".38"/>
    <path d="M78 100h84l-9 24H87z" fill="#fff" opacity=".18"/>
    <path d="M112 232h16v22h-16z" fill="none" stroke="#fff" stroke-width="5" opacity=".92"/>
    <circle cx="120" cy="243" r="13" fill="none" stroke="#fff" stroke-width="5" opacity=".8"/>
    <path d="M120 262v14" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`,

  // IR trace with absorption dips.
  ir: `
    <path d="M30 96h180M30 96v134" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>
    <path d="M32 122h30q10 0 16 34t16 34q10 0 14-20t12-20q9 0 13 46t15 46q9 0 13-26t14-26h34"
      fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>
    <path d="M30 244h180" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>
    <path d="M62 244v10M110 244v10M158 244v10M206 244v10" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/>`,

  // NMR peaks over a baseline.
  nmr: `
    <path d="M26 226h188" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".55"/>
    <path d="M40 226V132M58 226V166M96 226V96M110 226V148M150 226V116M164 226V178M196 226V158"
      stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".92"/>
    <path d="M26 250h188" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".3"/>
    <circle cx="96" cy="86" r="6" fill="#fff" opacity=".5"/>
    <circle cx="150" cy="106" r="5" fill="#fff" opacity=".45"/>`,

  /**
   * The two reagents this whole lab is about, drawn skeletally: a ketone and a
   * methyl Grignard. Deliberately just the structures. Curly arrows, partial
   * charges and lone pairs all crowded the hero, where this sits large and faint
   * behind the title and is meant to be read at a glance, not studied.
   */
  attack: `
    <g stroke="#fff" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
      <path d="M150 104v40M164 104v40" stroke-width="5"/>
      <path d="M157 148 200 176" stroke-width="5"/>
      <path d="M157 148 157 200" stroke-width="5"/>
      <path d="M76 176 116 176" stroke-width="5"/>
    </g>
    <text x="157" y="90" font-family="Georgia, serif" font-size="36" fill="#fff" text-anchor="middle" opacity=".92">O</text>
    <text x="70" y="185" font-family="Georgia, serif" font-size="26" fill="#fff" text-anchor="end" opacity=".9">MgBr</text>`,

  /** Friendly flask, for when the page should not take itself too seriously. */
  mascot: `
    <path d="M100 60v46L64 214q-7 24 18 24h76q25 0 18-24l-36-108V60" fill="none" stroke="#fff" stroke-width="5.5" stroke-linejoin="round" opacity=".92"/>
    <path d="M92 56h56" stroke="#fff" stroke-width="7.5" stroke-linecap="round" opacity=".92"/>
    <path d="M82 176h76l8 34q6 22-16 22H90q-22 0-16-22z" fill="#fff" opacity=".3"/>
    <circle cx="104" cy="196" r="7.5" fill="#fff" opacity=".92"/>
    <circle cx="140" cy="196" r="7.5" fill="#fff" opacity=".92"/>
    <path d="M106 214q16 14 32 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".92"/>
    <circle cx="88" cy="210" r="6" fill="#fff" opacity=".35"/>
    <circle cx="156" cy="210" r="6" fill="#fff" opacity=".35"/>
    <circle cx="118" cy="150" r="6" fill="#fff" opacity=".5"/>
    <circle cx="140" cy="132" r="4.5" fill="#fff" opacity=".45"/>
    <circle cx="104" cy="128" r="3.5" fill="#fff" opacity=".4"/>`,
};

export const ART_MOTIFS: ArtMotif[] = [
  "erlenmeyer",
  "benzene",
  "reflux",
  "sepfunnel",
  "ir",
  "nmr",
];

/** The motif's viewBox, so callers can size it without guessing. */
export const MOTIF_VIEWBOX = "0 0 240 320";

/**
 * Raw motif markup with the baked-in white swapped for a caller-chosen colour.
 *
 * The card art draws these on a saturated wash, where white reads well. The hero
 * puts the same shapes on pale paper, where white would be invisible, so the
 * colour has to be substitutable rather than fixed.
 */
export function motifMarkup(motif: ArtMotif, color = "currentColor"): string {
  return MOTIFS[motif].replace(/#fff\b/g, color);
}

/**
 * Builds a portrait card image: gradient wash, the site's faint grid, then the motif.
 */
export function cardArt(motif: ArtMotif, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" width="240" height="320">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="#fff" stroke-width="1" opacity=".13"/>
    </pattern>
    <radialGradient id="vig" cx=".5" cy=".38" r=".78">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".28"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="url(#g)"/>
  <rect width="240" height="320" fill="url(#grid)"/>
  ${MOTIFS[motif]}
  <rect width="240" height="320" fill="url(#vig)"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}
