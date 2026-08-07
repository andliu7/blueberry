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
  | "resonance"
  | "pka"
  | "vanillin"
  | "iodosalicylamide"
  | "chalcone"
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

  // Two contributors either side of the double-headed resonance arrow. Drawn
  // rather than reusing the benzene ring so the resonance deck does not wear
  // the same badge as the iodination one.
  resonance: `
    <path d="M74 118 46 134 46 166 74 182 102 166 102 134Z" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round" opacity=".92"/>
    <path d="M198 118 170 134 170 166 198 182 226 166 226 134Z" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round" opacity=".92"/>
    <path d="M52 140 66 132M52 160 66 168" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".65"/>
    <path d="M206 132 220 140M206 168 220 160" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".65"/>
    <path d="M118 150h36" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <path d="M126 142 116 150 126 158M146 142 156 150 146 158" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    <circle cx="74" cy="96" r="6" fill="#fff" opacity=".5"/>
    <circle cx="198" cy="204" r="6" fill="#fff" opacity=".5"/>`,

  // A titration curve with its half-equivalence point marked: the pKa.
  pka: `
    <path d="M40 60v200h176" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
    <path d="M56 236q44 0 60-30t26-58q10-28 54-28" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" opacity=".92"/>
    <path d="M128 92v130M40 148h88" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="7 9" opacity=".5"/>
    <circle cx="128" cy="148" r="9" fill="#fff" opacity=".85"/>
    <circle cx="128" cy="148" r="17" fill="none" stroke="#fff" stroke-width="3.5" opacity=".45"/>`,

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
   *
   * The carbonyl carbon is properly trigonal planar: substituents 120 degrees
   * off the C=O rather than one hanging straight down. Each fragment carries its
   * own small rotation so the two read as drifting past each other.
   */

  /**
   * Vanillin acetate, whole, with the borohydride waiting beside it.
   *
   * Lab 7 shared the Grignard's motif and read as the same experiment on the
   * folder page, which is the one place the two sit next to each other. This
   * draws the actual substrate: the ring, the methoxy, the acetate ester it has
   * to keep, and the aldehyde it is about to lose.
   *
   * The three substituents are labelled rather than drawn out to their last
   * bond. At 240x320 behind a card title, a full skeletal structure is a grey
   * tangle; the labels are what make it readable as this molecule.
   */
  /**
   * Vanillin acetate, whole, with the borohydride under it.
   *
   * Drawn Kekule rather than with the inner circle the benzene badge uses,
   * because half of what this lab asks is which carbonyl the hydride picks, and
   * a ring with alternating pi bonds sits next to two explicit C=O double bonds
   * without one of them looking like a different kind of drawing.
   *
   * The acetate is spelled out as Ar-O-C(=O)-CH3 rather than shortened to OAc,
   * since the ester is exactly the group that survives the reduction and the
   * point is lost if you cannot see it.
   *
   * The borohydride sits beside the aldehyde rather than under the molecule.
   * Stacked, it pushed the last line of ink to about 92% of the way down the
   * viewBox, and this drawing is used at half a dozen sizes in containers that
   * crop differently, so anything down there is the first thing to go. It also
   * reads better here: an arrow at the carbon it actually attacks says more than
   * a caption underneath saying the same thing in words.
   */
  vanillin: `
    <g transform="translate(21.6,4) scale(0.82)">
      <g stroke="#fff" fill="none" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
        <path d="M120 122 161.6 146 161.6 194 120 218 78.4 194 78.4 146Z"/>
        <path d="M123.8 134.6 148.8 149M148.8 191 123.8 205.4M87.4 155.6 87.4 184.4" stroke-width="5" opacity=".72"/>
      </g>

      <g stroke="#fff" fill="none" stroke-width="5.5" stroke-linecap="round" opacity=".92">
        <path d="M120 122 120 103"/>
        <path d="M115 82 88 66"/>
        <path d="M84 66 84 44M92 66 92 44"/>
        <path d="M88 66 58 83"/>
        <path d="M161.6 146 188 131"/>
        <path d="M120 218 120 252"/>
        <path d="M117.8 255.9 143.8 270.5M122.2 248.1 148.2 262.7"/>
        <path d="M120 252 96 265.5"/>
      </g>

      <g font-family="Georgia, serif" fill="#fff">
        <text x="120" y="99" font-size="24" text-anchor="middle" opacity=".9">O</text>
        <text x="88" y="38" font-size="24" text-anchor="middle" opacity=".9">O</text>
        <text x="52" y="94" font-size="20" text-anchor="end" opacity=".85">CH3</text>
        <text x="192" y="138" font-size="20" text-anchor="start" opacity=".85">OCH3</text>
        <text x="158" y="280" font-size="24" text-anchor="start" opacity=".9">O</text>
        <text x="88" y="276" font-size="22" text-anchor="end" opacity=".82">H</text>
      </g>
    </g>

    <g opacity=".82">
      <text x="24" y="250" font-family="Georgia, serif" font-size="22" fill="#fff" text-anchor="start">NaBH4</text>
      <path d="M96 240 112 220" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".6"/>
      <path d="M104 220 113 219 112 228" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>
    </g>`,

  /**
   * 5-iodosalicylamide, the product of Lab 4.
   *
   * All three substituents drawn, because the whole question the lab asks is
   * *where the iodine went*: the phenol and the amide both point at C5, and a
   * picture that leaves the iodine off cannot say that.
   */
  iodosalicylamide: `
    <g transform="translate(19.2,10) scale(0.84)">
      <g stroke="#fff" fill="none" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
        <path d="M120 122 161.6 146 161.6 194 120 218 78.4 194 78.4 146Z"/>
        <path d="M123.8 134.6 148.8 149M148.8 191 123.8 205.4M87.4 155.6 87.4 184.4" stroke-width="5" opacity=".72"/>
      </g>

      <g stroke="#fff" fill="none" stroke-width="5.5" stroke-linecap="round" opacity=".92">
        <path d="M120 218 120 250"/>
        <path d="M116 254 92 268M124 254 148 268"/>
        <path d="M78.4 194 50 210"/>
        <path d="M161.6 146 190 130"/>
      </g>

      <g font-family="Georgia, serif" fill="#fff">
        <text x="84" y="286" font-size="22" text-anchor="middle" opacity=".9">O</text>
        <text x="156" y="286" font-size="20" text-anchor="middle" opacity=".85">NH2</text>
        <text x="44" y="220" font-size="21" text-anchor="end" opacity=".9">OH</text>
        <text x="196" y="126" font-size="24" text-anchor="start" opacity=".9">I</text>
      </g>
    </g>`,

  /**
   * Chalcone, the enone that gets epoxidised in Lab 3.
   *
   * Two rings and the three carbons between them, because the reactive part is
   * exactly the bit in the middle: the C=C conjugated to the ketone. Drawn
   * smaller than the single-ring motifs so both rings fit without crowding the
   * card edge.
   *
   * Both strokes of the carbonyl straddle the bond axis, offset perpendicular to
   * it. The second one used to start at (164,108), which is not on the carbonyl
   * carbon at all — it hung in the air beside the chain and read as a stray line
   * rather than as half of a double bond.
   */
  chalcone: `
    <g transform="translate(6,14) scale(0.95)">
      <g stroke="#fff" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
        <path d="M56 58 78.5 71 78.5 97 56 110 33.5 97 33.5 71Z"/>
        <path d="M59.4 68.6 73 76.4M73 91.6 59.4 99.4M39.5 91.6 39.5 76.4" stroke-width="4.5" opacity=".7"/>

        <path d="M184 126 206.5 139 206.5 165 184 178 161.5 165 161.5 139Z"/>
        <path d="M187.4 136.6 201 144.4M201 159.6 187.4 167.4M167.5 159.6 167.5 144.4" stroke-width="4.5" opacity=".7"/>
      </g>

      <g stroke="#fff" fill="none" stroke-width="5" stroke-linecap="round" opacity=".92">
        <path d="M78.5 97 104 112"/>
        <path d="M104 112 130 97"/>
        <path d="M106 120 130 105" stroke-width="4.5" opacity=".85"/>
        <path d="M130 97 156 112"/>
        <path d="M156 112 161.5 139"/>
        <path d="M159.3 109.8 143.3 85.8M152.7 114.2 136.7 90.2"/>
      </g>

      <text x="146" y="76" font-family="Georgia, serif" font-size="22" fill="#fff" text-anchor="middle" opacity=".9">O</text>

      <g opacity=".8">
        <text x="120" y="252" font-family="Georgia, serif" font-size="19" fill="#fff" text-anchor="middle">the enone</text>
        <path d="M120 262 120 276" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
        <path d="M114 270 120 278 126 270" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
      </g>
    </g>`,

  attack: `
    <g transform="rotate(-7 157 148)">
      <g stroke="#fff" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
        <path d="M150 104v40M164 104v40" stroke-width="5"/>
        <path d="M157 148 200 173" stroke-width="5"/>
        <path d="M157 148 114 173" stroke-width="5"/>
      </g>
      <text x="157" y="90" font-family="Georgia, serif" font-size="36" fill="#fff" text-anchor="middle" opacity=".92">O</text>
    </g>
    <g transform="rotate(-15 86 206)">
      <path d="M66 206 106 206" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".92"/>
      <text x="60" y="215" font-family="Georgia, serif" font-size="26" fill="#fff" text-anchor="end" opacity=".9">MgBr</text>
    </g>`,

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

/**
 * Every motif, as a runtime list.
 *
 * This is what the uploader validates a `motif:` line against, so it has to
 * match `ArtMotif` exactly. It listed only the first six for a while, which
 * meant a text file asking for `attack` or `pka` was told the motif was unknown
 * and quietly given the flask instead, even though both drawings exist and the
 * built-in decks use them.
 */
export const ART_MOTIFS: ArtMotif[] = [
  "erlenmeyer",
  "benzene",
  "reflux",
  "sepfunnel",
  "ir",
  "nmr",
  "attack",
  "resonance",
  "pka",
  "vanillin",
  "iodosalicylamide",
  "chalcone",
  "mascot",
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
