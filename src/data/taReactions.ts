import type { StagedReaction } from "@/data/reactions";

/**
 * A reaction the TA added, drawn rather than typed.
 *
 * Kept apart from the generated set on purpose. Those 43 went through RDKit for
 * parse, valence and atom conservation and through a classifier for their type,
 * and none of that can run here: the pipeline is Python at build time. What a
 * browser can confirm is that the structures parse, because Ketcher parsed them
 * when they were drawn.
 *
 * So these are honest about the gap rather than blending in. They render with
 * the same amber "flagged" treatment a failed check gets, and say plainly that
 * conservation has not been checked. A TA-authored reaction sitting next to a
 * machine-checked one with no way to tell them apart is the outcome the whole
 * validation pipeline exists to prevent.
 */

export interface TaReaction {
  id: string;
  name: string;
  family: string;
  /** SMILES, read out of the drawing canvas. */
  substrate: string;
  substrateLabel: string;
  product: string;
  productLabel: string;
  /** One stage is enough to be useful; more can come later. */
  reagents: string;
  acidBase: "neutral" | "acidic" | "basic";
  notes: string;
  addedBy: string;
  addedAt: string;
}

export const newTaReactionId = () =>
  `ta-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;

/** Never throws. A bad row is dropped, not rendered half-formed. */
export function parseTaReactions(raw: unknown): TaReaction[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: TaReaction[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
    // A reaction with no name or no product is not one; skip rather than show
    // an entry that opens onto nothing.
    if (!str("name").trim() || !str("product").trim()) continue;
    const acidBase = str("acidBase");
    out.push({
      id: str("id") || newTaReactionId(),
      name: str("name"),
      family: str("family") || "carbonyls/addition",
      substrate: str("substrate"),
      substrateLabel: str("substrateLabel") || "starting material",
      product: str("product"),
      productLabel: str("productLabel") || "product",
      reagents: str("reagents"),
      acidBase:
        acidBase === "acidic" || acidBase === "basic" ? acidBase : "neutral",
      notes: str("notes"),
      addedBy: str("addedBy"),
      addedAt: str("addedAt"),
    });
  }
  return out;
}

export const serialiseTaReactions = (list: TaReaction[]) => JSON.stringify(list);

/**
 * Shaped like a generated reaction so the existing panel can render it.
 *
 * `validation.status` is "flagged" deliberately. That is the amber box, and the
 * problems list says exactly what was and was not checked. It is not a bug
 * report; it is the difference between "a person drew this" and "a machine
 * confirmed the atoms balance", and the page should never hide which one you
 * are looking at.
 */
export function toStagedReaction(ta: TaReaction): StagedReaction {
  return {
    id: ta.id,
    name: ta.name,
    family: ta.family,
    tier: 0,
    reactants: ta.substrate ? [ta.substrate] : [],
    reactant_labels: [ta.substrateLabel],
    stages: [
      {
        order: 1,
        role: "reagent",
        reagents: ta.reagents ? ta.reagents.split(/\s*[|;]\s*/).filter(Boolean) : [],
        conditions: {
          temperature_c: null,
          solvent: "",
          acid_base: ta.acidBase,
          notes: ta.notes,
        },
        byproducts: [],
      },
    ],
    intermediates: [],
    product: ta.product,
    product_label: ta.productLabel,
    reaction_type: "",
    reversible: false,
    committed_step_index: 1,
    provenance: "ta-verified",
    validation: {
      status: "flagged",
      checks: {
        parse: "ok (drawn in the editor)",
        conservation: "not run",
        classification: "not run",
      },
      problems: [
        `Added by ${ta.addedBy || "course staff"}. Structures parse, but atom and charge conservation have not been checked and the reaction type has not been classified.`,
      ],
    },
    balance_lhs: [],
    balance_rhs: [],
    redox: false,
    // No rendered artwork: those SVGs come out of the Python build. The panel
    // falls back to "No structure drawing yet" rather than a broken image.
    art: {},
  };
}
