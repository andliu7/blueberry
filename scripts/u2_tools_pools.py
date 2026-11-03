"""
Unit 2 "tools" lessons (29 Oct 2026): the Orgo I ideas Orgo II quietly leans on,
taught before the rings need them. Writes src/game/content/u2tools/pools.ts.

  u2-induction       induction: charge pulled through sigma bonds
  u2-keq-pka         pKa tells you which side of an equilibrium wins
  u2-resonance       resonance as the reason an aromatic ring is stable
  u2-ewg-edg         donors and withdrawers (the review Unit 3 leans on)
  u2-nomen-priority  side quest: suffix priority, lowest locants, when o/m/p stops

Ranked by test value from reports/Orgo II course comparison.md (gaps 1 to 5).

EVERY ENTRY IS A DRAFT (placeholder: true). Rules kept:
  - every answer is DERIVED here and the script refuses to write when an authored
    key disagrees with what it derived: graph distance and halogen counts from
    RDKit, resonance contributors from RDKit's ResonanceMolSupplier, bond lengths
    from an MMFF geometry, ring positions from the ring path, structure to name
    agreement from OPSIN;
  - course pKa values are READ from packages/curriculum/src/pka.ts (the table the
    professor can adjust), never typed here;
  - a handful of textbook facts RDKit cannot derive (the heat of hydrogenation of
    benzene, the halogen anomaly, Pauling electronegativities) are authored and
    their provenance says "NEEDS OWNER CHECK".
It reuses the figure and copy-lint helpers of scripts/u2_pools.py unchanged.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import u2_pools as u  # noqa: E402
from rdkit import Chem  # noqa: E402
from rdkit.Chem import AllChem  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "src" / "game" / "content" / "u2tools" / "pools.ts"
SRC_POOLS = REPO / "src" / "game" / "content" / "u2" / "pools.ts"
PKA_TS = REPO / "packages" / "curriculum" / "src" / "pka.ts"
SCRIPT = "scripts/u2_tools_pools.py"
OS_2 = "OpenStax Organic Chemistry 2.8 and 2.9 (CC BY-NC-SA), read as a check only"
OS_16 = "OpenStax Organic Chemistry 16.4 and 16.5 (CC BY-NC-SA), read as a check only"
OS_15 = "OpenStax Organic Chemistry 15.1 to 15.2 (CC BY-NC-SA), read as a check only"
OS_1 = "OpenStax Organic Chemistry 1.2 and 2.1 (CC BY-NC-SA), read as a check only"
OS_NAME = "OpenStax Organic Chemistry 15.1 and 17.1 (CC BY-NC-SA), read as a check only"

fail = u.fail
PX = u.POOLS  # shared dict: u.mcq writes here
POOLS = PX
TOPIC_ALL = {
    "u2-induction": "pka_and_acidity",
    "u2-keq-pka": "pka_and_acidity",
    "u2-resonance": "resonance_and_delocalisation",
    "u2-ewg-edg": "eas_directing_effects",
    "u2-nomen-priority": "iupac_nomenclature",
}
SORTF = u.SORT_FIGURES

# ---------------------------------------------------------------------------
# The course pKa table, read from the TypeScript source
# ---------------------------------------------------------------------------


def course_pka() -> dict[str, float]:
    text = PKA_TS.read_text(encoding="utf-8")
    out: dict[str, float] = {}
    for m in re.finditer(r'id:\s*"([a-z_]+)",[^{}]*?pka:\s*(-?[0-9.]+)', text, re.S):
        out[m.group(1)] = float(m.group(2))
    for need in ("hydronium", "carboxylic_acid", "carbonic_acid", "phenol", "water", "alcohol", "ketone_alpha_ch", "terminal_alkyne_ch", "amine_nh", "ammonium"):
        if need not in out:
            fail(f"course pKa table has no {need}")
    return out


PKA = course_pka()

SITES = [
    ("hydronium", "[OX3H3+]"),
    ("carbonic_acid", "[OX2H1][CX3](=O)[OX2H1]"),
    ("carboxylic_acid", "[CX3](=O)[OX2H1]"),
    ("phenol", "c[OX2H1]"),
    ("water", "[OX2H2]"),
    ("alcohol", "[CX4][OX2H1]"),
    ("ammonium", "[NX4+;!H0]"),
    ("terminal_alkyne_ch", "[CX2;H1]#[#6]"),
    ("ketone_alpha_ch", "[CX4;!H0][CX3](=O)[#6]"),
    ("amine_nh", "[NX3;H3,H2,H1;!$(NC=O)]"),
]


def site_of(smi: str) -> str:
    m = u.mol(smi)
    for name, sma in SITES:
        if m.HasSubstructMatch(Chem.MolFromSmarts(sma)):
            return name
    fail(f"no acid site for {smi}")
    return "alcohol"


def conj_acid(base: str) -> str:
    """Protonate the one negative atom of a base (ethoxide to ethanol, hydroxide to water, NH2- to ammonia)."""
    m = Chem.RWMol(u.mol(base))
    neg = [a for a in m.GetAtoms() if a.GetFormalCharge() < 0]
    if len(neg) != 1:
        fail(f"{base}: expected one anionic atom")
    a = neg[0]
    a.SetFormalCharge(0)
    a.SetNumExplicitHs(a.GetNumExplicitHs() + 1)
    a.SetNoImplicit(False)
    Chem.SanitizeMol(m)
    return Chem.MolToSmiles(m)


def pka_of(smi: str) -> float:
    return PKA[site_of(smi)]


def favoured(acid: str, base: str) -> str:
    """'products' when the acid FORMED is the weaker one (higher pKa), 'reactants' when it is the acid CONSUMED, 'even'."""
    consumed = pka_of(acid)
    formed = pka_of(conj_acid(base))
    if formed > consumed:
        return "products"
    if formed < consumed:
        return "reactants"
    return "even"


# ---------------------------------------------------------------------------
# Figure helpers
# ---------------------------------------------------------------------------


def atom_fig(text: str) -> dict:
    return {"bonds": [], "labels": [{"x": 60.0, "y": 50.0, "t": text, "size": 22}]}


def fig(x) -> dict:
    """A SMILES, or ('atom', 'OH-') for a single-atom species RDKit cannot lay out."""
    if isinstance(x, tuple):
        return atom_fig(x[1])
    if x == "[OH3+]":
        return atom_fig("H3O⁺")
    return u.figure(x)


def nf(x, cap: str) -> dict:
    return {"figure": fig(x), "name": cap}


def S(x, cap: str) -> dict:
    return {"kind": "structure", "figure": fig(x), "name": cap, "large": True}


def P(a, ca: str, b, cb: str) -> dict:
    return {"kind": "pair", "a": nf(a, ca), "b": nf(b, cb), "large": True}


def mcq(node, id, prompt, options, derived, correct, explanation, provenance, visual, uses=None, tiles=None, brief=None, level=1, concepts=None):
    u.mcq(node, id, prompt, options, derived, correct, explanation, provenance, visual, uses or [], tiles=tiles, brief=brief, level=level, concepts=concepts or (node,))


def pv(what: str, page: str, owner_check: str | None = None) -> str:
    extra = f" NEEDS OWNER CHECK: {owner_check}." if owner_check else ""
    return f"{SCRIPT}: {what}. {page}.{extra}"


# ---------------------------------------------------------------------------
# Ladder (copy of u2_pools.ladder, minus the aromaticity class model: the order is derived by the caller)
# ---------------------------------------------------------------------------


def ladder(node, id, cards, derived_order, prompt, brief, criterion, track, problem_prompt, solution, distractors, explanation, provenance, concepts):
    """cards: (card id, label, smiles, why) authored most first. derived_order: card ids in the order the script derived."""
    if id in u.IDS:
        fail(f"duplicate id {id}")
    u.IDS.add(id)
    order = [c[0] for c in cards]
    if derived_order != order:
        fail(f"{id}: authored order {order}, derived order {derived_order}")
    for did, dorder, cause, _ in distractors:
        if sorted(dorder) != sorted(order) or dorder == order:
            fail(f"{id}: distractor {did} is not a wrong permutation")
    for cid, label, _, why in cards:
        u.lint_copy(f"{id} card {cid}", label, u.CARD_CAP)
        u.lint_copy(f"{id} why {cid}", why, u.CAPS["why"])
    u.lint_copy(f"{id} prompt", prompt, u.CAPS["prompt"])
    u.lint_copy(f"{id} brief", brief, u.CAPS["brief"])
    for part in solution:
        u.lint_copy(f"{id} solution", part)
    for _, _, _, e in distractors:
        for part in e:
            u.lint_copy(f"{id} distractor", part)
    POOLS.setdefault(node, []).append({
        "__ladder__": True,
        "id": id,
        "node": node,
        "problemId": "u2t-" + id,
        "topic": TOPIC_ALL[node],
        "difficulty": 1100,
        "problemPrompt": problem_prompt,
        "criterionText": track[0].lower(),
        "items": [{"id": c, "text": label} for c, label, _, _ in cards],
        "order": order,
        "solution": {"whatHappened": solution[0], "why": solution[1], "lookAt": solution[2]},
        "distractors": [
            {"id": did, "cause": cause, "order": dorder, "explanation": {"whatHappened": e[0], "why": e[1], "lookAt": e[2]}}
            for did, dorder, cause, e in distractors
        ],
        "beat": {
            "conceptIds": list(concepts),
            "prompt": prompt,
            "brief": brief,
            "criterion": criterion,
            "direction": "descending",
            "notes": {c: why for c, _, _, why in cards},
        },
        "trackEnds": {"first": track[0], "last": track[1]},
        "meanings": [
            {"id": did, "cause": "order_fully_reversed" if cause == "ordering_is_reversed" else "order_adjacent_pair_swapped"}
            for did, _, cause, _ in distractors
        ],
        "explanation": explanation,
        "provenance": provenance,
    })
    u.USES[id] = []
    SORTF[id] = {c: nf(smi, label) for c, label, smi, _ in cards}


def match(node, id, prompt, brief, pairs, explanation, provenance, concepts):
    u.match(node, id, prompt, brief, pairs, explanation, provenance, [], concepts=concepts)


# ---------------------------------------------------------------------------
# RDKit derivations
# ---------------------------------------------------------------------------

PAULING = {"F": 3.98, "Cl": 3.16, "Br": 2.96, "I": 2.66, "C": 2.55, "H": 2.20, "N": 3.04, "O": 3.44}
ACID_C = Chem.MolFromSmarts("[CX3](=O)[OX2H1]")


def n_halogens(smi: str, sym: str | None = None) -> int:
    m = u.mol(smi)
    return sum(1 for a in m.GetAtoms() if a.GetSymbol() in ("F", "Cl", "Br", "I") and (sym is None or a.GetSymbol() == sym))


def halogen_distance(smi: str, target_smarts: str = "[CX3](=O)[OX2H1]") -> int | None:
    """Fewest bonds from any halogen to the first atom of the acid group; None with no halogen."""
    m = u.mol(smi)
    hit = m.GetSubstructMatch(Chem.MolFromSmarts(target_smarts))
    hal = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() in ("F", "Cl", "Br", "I")]
    if not hal or not hit:
        return None
    return min(len(Chem.GetShortestPath(m, h, hit[0])) - 1 for h in hal)


def halogen_resonance_path(smi: str) -> bool:
    """True when a halogen can push a lone pair into the acid group by resonance: needs an unbroken run of sp2 atoms. Here: any sp3 atom on the path stops it."""
    m = u.mol(smi)
    hit = m.GetSubstructMatch(ACID_C)
    for a in m.GetAtoms():
        if a.GetSymbol() in ("F", "Cl", "Br", "I"):
            path = Chem.GetShortestPath(m, a.GetIdx(), hit[0])
            if all(m.GetAtomWithIdx(i).GetHybridization() != Chem.HybridizationType.SP3 for i in path[1:-1]):
                return True
    return False


# Reference pKa values from the textbook, used ONLY to check that the derived direction (distance, count, electronegativity) matches measurement. Never shown.
REF_PKA = {
    "CC(=O)O": 4.76, "OC(=O)CF": 2.66, "OC(=O)CCl": 2.86, "OC(=O)CBr": 2.90,
    "OC(=O)C(Cl)Cl": 1.35, "OC(=O)C(Cl)(Cl)Cl": 0.65, "OC(=O)CCCl": 4.0, "OC(=O)CCCCl": 4.52,
    "CCO": 15.9, "OCC(F)(F)F": 12.4,
    "CCCN": 10.6, "NCCCl": 8.8, "NCCCCl": 9.9,
}


def ref(smi: str) -> float:
    key = Chem.MolToSmiles(u.mol(smi))
    for k, v in REF_PKA.items():
        if Chem.MolToSmiles(u.mol(k)) == key:
            return v
    fail(f"no reference pKa for {smi}")
    return 0.0


def charge_carriers(smi: str, flags: int | None = None) -> set[int]:
    """Atoms that carry a formal charge in at least one resonance contributor."""
    import random

    m = Chem.Mol(u.mol(smi))
    for a in m.GetAtoms():
        a.SetIntProp("orig", a.GetIdx())
    f = flags if flags is not None else (Chem.ALLOW_INCOMPLETE_OCTETS | Chem.UNCONSTRAINED_CATIONS | Chem.UNCONSTRAINED_ANIONS)
    seen: set[int] = set()
    rnd = random.Random(3)
    # RDKit's supplier drops one contributor of a symmetric ring depending on atom order, so the union over
    # several atom orderings is taken: the charge sites are a property of the molecule, not of its numbering.
    for _ in range(12):
        perm = list(range(m.GetNumAtoms()))
        rnd.shuffle(perm)
        sup = Chem.ResonanceMolSupplier(Chem.RenumberAtoms(m, perm), f)
        for i in range(len(sup)):
            for a in sup[i].GetAtoms():
                if a.GetFormalCharge() != 0 and a.GetSymbol() == "C":
                    seen.add(a.GetIntProp("orig"))
    return seen


def cc_lengths(smi: str) -> list[float]:
    """Ring C-C bond lengths from an MMFF geometry, in angstroms."""
    m = Chem.AddHs(u.mol(smi))
    AllChem.EmbedMolecule(m, randomSeed=7)
    AllChem.MMFFOptimizeMolecule(m, maxIters=2000)
    conf = m.GetConformer()
    out = []
    for b in m.GetBonds():
        a, c = b.GetBeginAtom(), b.GetEndAtom()
        if a.GetSymbol() == "C" and c.GetSymbol() == "C" and b.IsInRing():
            p, q = conf.GetAtomPosition(a.GetIdx()), conf.GetAtomPosition(c.GetIdx())
            out.append(round(p.Distance(q), 3))
    return out


def substituent_kind(smi: str) -> str:
    """Classify the one group on a benzene ring: res_donor, res_withdrawer, ind_withdrawer, ind_donor, halogen."""
    m = u.mol(smi)
    ring = set(m.GetRingInfo().AtomRings()[0])
    attach = [(i, n) for i in ring for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetIdx() not in ring]
    if len(attach) != 1:
        fail(f"{smi}: expected one substituent")
    x = attach[0][1]
    sym = x.GetSymbol()
    if sym in ("F", "Cl", "Br", "I"):
        return "halogen"
    if sym in ("O", "N") and x.GetFormalCharge() <= 0 and not any(n.GetFormalCharge() > 0 for n in x.GetNeighbors()):
        return "res_donor"
    if sym == "N" and x.GetFormalCharge() > 0:
        return "res_withdrawer"
    if sym == "C":
        if any(b.GetBondTypeAsDouble() >= 2 and b.GetOtherAtom(x).GetSymbol() in ("O", "N") for b in x.GetBonds()):
            return "res_withdrawer"
        if any(b.GetBondTypeAsDouble() == 3 for b in x.GetBonds()):
            return "res_withdrawer"
        hal = sum(1 for n in x.GetNeighbors() if n.GetSymbol() in ("F", "Cl", "Br", "I"))
        if hal >= 2:
            return "ind_withdrawer"
        if all(n.GetSymbol() in ("C", "H") or n.GetIdx() in ring for n in x.GetNeighbors()):
            return "ind_donor"
    fail(f"{smi}: group not classified")
    return "?"


KIND_TEXT = {
    "res_donor": "Donor by resonance",
    "res_withdrawer": "Withdrawer by resonance",
    "ind_withdrawer": "Withdrawer by induction",
    "ind_donor": "Donor by induction",
}


def pos_of(smi: str) -> str | None:
    return u.relation(smi)


# ---------------------------------------------------------------------------
# LESSON 1: u2-induction
# ---------------------------------------------------------------------------


def node_induction() -> None:
    node = "u2-induction"
    base = "CC(=O)O"
    cap_base = "acetic acid, the baseline"
    pv_ = lambda what: pv(what, OS_2)

    # meet 1 (L0): why is chloroacetic acid stronger? sigma only
    cl = "OC(=O)CCl"
    via = "induction" if not halogen_resonance_path(cl) else "resonance"
    mcq(node, "u2t-ind-meet-why",
        "Chloroacetic acid is stronger than acetic acid. What does the Cl do.",
        [("pull", "Pulls electron density through the bonds", "Cl is more electronegative than C, so it tugs the bonding electrons toward itself. That tug reaches the carboxylate and steadies its negative charge."),
         ("push", "Pushes a lone pair into the carboxylate", "Cl has lone pairs, but an sp3 carbon sits between Cl and the acid group. A lone pair cannot cross an sp3 carbon, so no resonance is possible here."),
         ("size", "Takes up more room than H", "Size plays no part in the acidity here. The effect is electronic and it travels through the bonds.")],
        {"induction": "pull", "resonance": "push"}[via], "pull",
        "Cl is electronegative and pulls electron density along the sigma bonds. That is induction, and it steadies the carboxylate.",
        pv_("the sp3 CH2 between Cl and the acid group blocks any pi path, so only induction is left"),
        P(base, cap_base, cl, "chloroacetic acid"), level=0,
        brief="Both are carboxylic acids. Only one atom differs, so the Cl has to explain the gap.")

    # meet 2 (L0): who holds the electrons in C-Cl
    ch3cl = "CCl"
    holder = "Cl" if PAULING["Cl"] > PAULING["C"] else "C"
    mcq(node, "u2t-ind-meet-bond",
        "In a C-Cl bond, which atom holds the shared electrons closer.",
        [("c", "Carbon", "Carbon is less electronegative than chlorine, so it ends up with the smaller share."),
         ("cl", "Chlorine", "Chlorine is more electronegative than carbon, so the pair sits nearer to it. Carbon is left slightly positive."),
         ("eq", "Neither, they share evenly", "Equal sharing needs equal electronegativity. C and Cl are different, so the bond is polar.")],
        "cl" if holder == "Cl" else "c", "cl",
        "A more electronegative atom holds the shared pair closer, so the bond is polar. Induction is that pull passed along a chain of sigma bonds.",
        pv("Pauling values: Cl above C, so the pair sits nearer Cl", OS_2, "Pauling electronegativities are authored textbook values, not derived by RDKit"),
        S(ch3cl, "chloromethane"), level=0)

    # L1: distance
    opts = {"a": "OC(=O)CCl", "b": "OC(=O)CCCl", "c": "OC(=O)CCCCl"}
    dist = {k: halogen_distance(v) for k, v in opts.items()}
    strongest = min(dist, key=lambda k: dist[k])
    refs = sorted(opts, key=lambda k: ref(opts[k]))
    if refs[0] != strongest:
        fail("u2t-ind-distance: derived strongest acid disagrees with the reference pKa")
    mcq(node, "u2t-ind-distance",
        "Each acid has one Cl. Which is the strongest.",
        [("a", "Cl one carbon from the acid group", "The Cl is closest, so its pull on the carboxylate is strongest and the acid is strongest."),
         ("b", "Cl two carbons from the acid group", "The pull weakens as it passes each extra bond, so this one is weaker than the Cl that sits one carbon away."),
         ("c", "Cl three carbons from the acid group", "Three bonds of distance leave almost nothing of the pull, so this acid is close to acetic acid.")],
        strongest, "a",
        "Induction fades with each bond it passes through. The closer the Cl is to the acid group, the stronger the acid.",
        pv_("graph distance from each Cl to the carboxyl carbon; the nearest Cl is the strongest, and the order matches the textbook pKa values"),
        S(base, cap_base),
        tiles={"a": nf(opts["a"], "ClCH2CO2H"), "b": nf(opts["b"], "Cl two carbons away"), "c": nf(opts["c"], "Cl three carbons away")},
        brief="Count the bonds from Cl to the acid group. Fewer bonds means a stronger pull.")

    # L1: count
    cnt = {"a": "OC(=O)CCl", "b": "OC(=O)C(Cl)Cl", "c": "OC(=O)C(Cl)(Cl)Cl"}
    n = {k: n_halogens(v) for k, v in cnt.items()}
    strongest = max(n, key=lambda k: n[k])
    if sorted(cnt, key=lambda k: ref(cnt[k]))[0] != strongest:
        fail("u2t-ind-count: derived strongest acid disagrees with the reference pKa")
    mcq(node, "u2t-ind-count",
        "All three Cl sit on the carbon next to the acid group. Which acid is strongest.",
        [("c", "Three Cl on the carbon", "Three electronegative atoms pull at once and their pulls add up, so the carboxylate is steadied most."),
         ("a", "One Cl on the carbon", "One Cl helps, but two or three would help more."),
         ("b", "Two Cl on the carbon", "Two Cl help more than one, but three at the same distance help more again.")],
        {"a": "a", "b": "b", "c": "c"}[strongest], "c",
        "At the same distance, each extra electronegative atom adds to the pull. Trichloroacetic acid is the strongest of the chlorinated acetic acids.",
        pv_("count of Cl at the same bond distance; the largest count is strongest, matching the textbook pKa values"),
        S(base, cap_base),
        tiles={"a": nf(cnt["a"], "one Cl"), "b": nf(cnt["b"], "two Cl"), "c": nf(cnt["c"], "three Cl")},
        brief="The Cl are all one carbon from the acid group. Only their number changes.")

    # L1: amine basicity
    am = {"a": "CCCN", "b": "NCCCl", "c": "NCCCCl"}
    d_n = {k: halogen_distance(v, "[NX3;H2]") for k, v in am.items()}
    withcl = {k: d for k, d in d_n.items() if d is not None}
    weakest = min(withcl, key=lambda k: withcl[k])
    if ref(am[weakest]) != min(ref(v) for v in am.values()):
        fail("u2t-ind-amine: derived weakest base disagrees with the reference pKa")
    mcq(node, "u2t-ind-amine",
        "Which amine is the weakest base. Its N lone pair is the base.",
        [("b", "Cl two bonds from the N", "The Cl is close, so it pulls the lone pair's density away. A lone pair that is pulled on is less willing to take a proton."),
         ("a", "No Cl at all", "With nothing pulling on it, this N keeps the most electron density, so it is the strongest base of the three."),
         ("c", "Cl three bonds from the N", "The Cl is there but farther off, so it drains less than the close one.")],
        {"a": "a", "b": "b", "c": "c"}[weakest], "b",
        "Induction works on bases too. An electron-withdrawing atom close to the N makes the lone pair less available, so the amine is a weaker base.",
        pv_("graph distance from Cl to the amine N; the nearest Cl gives the weakest base, matching textbook pKa values of the conjugate acids"),
        S("CCN", "ethylamine, the baseline"),
        tiles={"a": nf(am["a"], "propylamine"), "b": nf(am["b"], "2-chloroethylamine"), "c": nf(am["c"], "3-chloropropylamine")},
        brief="The same rule as for acids, read the other way: what the pull does to the lone pair.", level=u.L2)

    # L2: halogen identity
    hx = {"f": "OC(=O)CF", "cl": "OC(=O)CCl", "br": "OC(=O)CBr"}
    sym = {"f": "F", "cl": "Cl", "br": "Br"}
    strongest = max(hx, key=lambda k: PAULING[sym[k]])
    if sorted(hx, key=lambda k: ref(hx[k]))[0] != strongest:
        fail("u2t-ind-halogen: electronegativity order disagrees with the reference pKa")
    mcq(node, "u2t-ind-halogen",
        "The halogen sits on the same carbon in each acid. Which acid is strongest.",
        [("br", "Bromoacetic acid", "Br is the least electronegative of the three, so it pulls the least."),
         ("f", "Fluoroacetic acid", "F is the most electronegative, so at the same distance it pulls hardest and gives the strongest acid."),
         ("cl", "Chloroacetic acid", "Cl is in the middle. It pulls harder than Br and less hard than F.")],
        {"f": "f", "cl": "cl", "br": "br"}[strongest], "f",
        "Position and count are the same, so the atom's electronegativity decides. F pulls hardest, then Cl, then Br.",
        pv("the halogen with the highest Pauling value gives the strongest acid, matching the textbook pKa values", OS_2, "Pauling electronegativities are authored textbook values, not derived by RDKit"),
        S(base, cap_base),
        tiles={"f": nf(hx["f"], "fluoroacetic acid"), "cl": nf(hx["cl"], "chloroacetic acid"), "br": nf(hx["br"], "bromoacetic acid")},
        brief="Distance and number are fixed. What is left to compare is the atom itself.", level=u.L2)

    # L2: alcohol
    al = {"a": "CCO", "b": "OCC(F)(F)F", "c": "OCCCF"}
    # F weights: three F on the beta carbon, vs one F farther away
    def pull(smi):
        d = halogen_distance(smi, "[CX4][OX2H1]")
        return 0.0 if d is None else n_halogens(smi) / d
    strongest = max(al, key=lambda k: pull(al[k]))
    ref_al = {"a": ref("CCO"), "b": ref("OCC(F)(F)F")}
    if not (ref_al["b"] < ref_al["a"]):
        fail("u2t-ind-alcohol: reference pKa order wrong")
    mcq(node, "u2t-ind-alcohol",
        "Which alcohol is the strongest acid. Think about its alkoxide.",
        [("a", "Ethanol", "No electronegative atom nearby, so the alkoxide has nothing to steady it."),
         ("b", "2,2,2-Trifluoroethanol", "Three F two bonds from the O pull on the alkoxide together, so it is much steadier than ethoxide and the alcohol is far more acidic."),
         ("c", "3-Fluoropropan-1-ol", "One F three bonds from the O. It helps a little, but nothing like three F close by.")],
        {"a": "a", "b": "b", "c": "c"}[strongest], "b",
        "The acidity of an O-H follows the alkoxide it leaves behind. Several F close by steady it far more than one F farther off.",
        pv_("pull scored as halogen count over bond distance to the O; the trifluoro alcohol wins and the reference pKa agrees (about 12 against about 16 for ethanol)"),
        S("OCC", "ethanol"),
        tiles={"a": nf("CCO", "ethanol"), "b": nf(al["b"], "trifluoroethanol"), "c": nf(al["c"], "3-fluoropropanol")},
        level=u.L2)

    # ---- Orgo I recall: the other ways a charge is steadied (resonance, then s character) ----
    ph, et = len(charge_carriers("[O-]c1ccccc1")), len(charge_carriers("CC[O-]"))
    mcq(node, "u2t-ind-recall-res",
        "Phenol is a stronger acid than ethanol. Which Unit 0 idea steadies phenoxide.",
        [("ind", "Induction through sigma bonds", "Neither anion has an electronegative atom pulling along sigma bonds, so induction does not separate them."),
         ("res", "Resonance into the ring", "The charge on O reaches the ortho and para carbons through the pi system. Ethoxide has no pi system to spread into."),
         ("chg", "A bigger negative charge", "Both anions carry one negative charge. The difference is where it can go, not how much there is.")],
        "res" if ph > 0 and et == 0 else None, "res",
        "Resonance is the Unit 0 way to steady a charge, and induction is the new one. Phenoxide spreads its charge into the ring, ethoxide cannot, so phenol is the stronger acid.",
        pv(f"RDKit ResonanceMolSupplier: the phenoxide charge reaches {ph} ring carbons and the ethoxide charge reaches {et}", OS_2),
        P("c1ccccc1O", "phenol", "CCO", "ethanol"), level=1,
        brief="Recall from Unit 0. Ask where each anion can put its charge.")
    hyb_c = {"ane": "CC", "ene": "C=C", "yne": "C#C"}
    sfrac = {}
    for k, v in hyb_c.items():
        hyb = u.mol(v).GetAtomWithIdx(0).GetHybridization()
        sfrac[k] = {Chem.HybridizationType.SP: 0.5, Chem.HybridizationType.SP2: 1 / 3, Chem.HybridizationType.SP3: 0.25}[hyb]
    most = max(sfrac, key=lambda k: sfrac[k])
    mcq(node, "u2t-ind-recall-hyb",
        "Which C-H is the most acidic. Think about the carbon's orbital.",
        [("ane", "The C-H of ethane", "An sp3 carbon is one quarter s, so it holds its anion's pair far from the nucleus. It is the weakest acid of the three."),
         ("ene", "The C-H of ethene", "An sp2 carbon is one third s. That helps, but it is not the most s character on offer."),
         ("yne", "The C-H of ethyne", "An sp carbon is half s, and s orbitals sit closer to the nucleus. The anion's pair is held tightly, so this C-H is the most acidic.")],
        most, "yne",
        "More s character holds the pair closer to the nucleus, which steadies the anion. Hybridisation is a third way to steady a charge, beside resonance and induction, and sp beats sp2 beats sp3.",
        pv("hybridisation of the carbon read from RDKit: sp, sp2 and sp3 carry 50, 33 and 25 percent s character", OS_2),
        P("C#C", "ethyne", "CC", "ethane"), level=1,
        brief="Recall from Unit 0. Compare the s character of each carbon.")

    # Ladder: acids by Cl count
    order_ids = ["tri", "di", "mono", "none"]
    smi = {"tri": "OC(=O)C(Cl)(Cl)Cl", "di": "OC(=O)C(Cl)Cl", "mono": "OC(=O)CCl", "none": "CC(=O)O"}
    derived = sorted(smi, key=lambda k: -n_halogens(smi[k]))
    if sorted(smi, key=lambda k: ref(smi[k])) != derived:
        fail("u2t-ind-ladder: Cl count order disagrees with the reference pKa order")
    ladder(node, "u2t-ind-ladder",
           [("tri", "Trichloroacetic acid", smi["tri"], "Three Cl pull on the same carbon, the biggest steadying of the carboxylate."),
            ("di", "Dichloroacetic acid", smi["di"], "Two Cl pull, so it is strong but not as strong as three."),
            ("mono", "Chloroacetic acid", smi["mono"], "One Cl helps, but less than two."),
            ("none", "Acetic acid", smi["none"], "No electronegative atom to steady the carboxylate, so it is the weakest of the four.")],
           derived,
           "Rank these acids, strongest first.",
           "Same position, only the number of Cl changes. Each Cl adds to the pull.",
           "acidity", ("Strongest acid", "Weakest acid"),
           "Rank acetic acid and its chloro derivatives by acidity, strongest first.",
           ("Trichloro, dichloro, chloro, then acetic acid.", "Each Cl at the same distance adds to the pull on the carboxylate, so more Cl means a steadier base and a stronger acid.", "Count the Cl on the carbon next to the acid group."),
           [("reversed", ["none", "mono", "di", "tri"], "ordering_is_reversed", ("The right ladder read from the other end.", "Every comparison is reasoned correctly but the track wants the strongest acid first.", "Put the trichloro acid in the first position.")),
            ("tie", ["tri", "mono", "di", "none"], "ordering_one_adjacent_pair_swapped", ("Chloroacetic acid is placed above dichloroacetic acid.", "Two Cl pull harder than one at the same distance, so the dichloro acid is the stronger.", "Compare the Cl counts of the two middle cards."))],
           "At the same distance, more electron-withdrawing atoms mean a steadier conjugate base and a stronger acid.",
           pv_("ranked by Cl count from RDKit; the order matches the textbook pKa values (about 0.7, 1.3, 2.9, 4.8)"),
           (node,))


# ---------------------------------------------------------------------------
# LESSON 2: u2-keq-pka
# ---------------------------------------------------------------------------

SIDE = {"products": "Products", "reactants": "Reactants", "even": "Neither side"}


def scenario(node, id, acid, base, acid_cap, base_cap, prompt, explanation, level, brief=None, extra=None):
    bs = base[2] if isinstance(base, tuple) else base
    got = favoured(acid, bs)
    opts = {
        "products": ("products", "Products", "The acid formed is the weaker of the two, so the proton ends up where it is held more tightly. The equilibrium leans to the products."),
        "reactants": ("reactants", "Reactants", "The acid consumed is the weaker of the two, so it holds its proton better. The equilibrium stays on the reactant side."),
        "even": ("even", "An even mix", "The two acids differ in strength, so the equilibrium is not even. The weaker acid is favoured."),
    }
    options = []
    for k in ("products", "reactants", "even"):
        options.append((k, opts[k][1], opts[k][2]))
    explanation = f"{explanation} Course values: the acid used up is about {pka_of(acid):g}, the acid formed about {pka_of(conj_acid(bs)):g}."
    mcq(node, id, prompt, options, got, got, explanation,
        pv(f"course pKa from packages/curriculum pka.ts: acid consumed {site_of(acid)} {pka_of(acid)}, acid formed {site_of(conj_acid(bs))} {pka_of(conj_acid(bs))}", OS_2),
        P(acid if not isinstance(acid, tuple) else acid, acid_cap, base, base_cap), level=level, brief=brief)


SUP = str.maketrans("0123456789-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻")


def tenpow(e: int) -> str:
    return "10" + str(e).translate(SUP)


def keq_exp(acid: str, base: str) -> int:
    """log10 Keq for HA + B- going to A- + HB, read as pKa(HB) minus pKa(HA) from the course table."""
    d = pka_of(conj_acid(base)) - pka_of(acid)
    if abs(d - round(d)) > 0.01:
        fail(f"keq_exp {acid} {base}: gap {d} is not a whole number of pKa units")
    return int(round(d))


def keq_size(node, id, acid, base, acid_cap, base_cap, level, rot, brief=None):
    e = keq_exp(acid, base)
    formed = int(round(pka_of(conj_acid(base))))
    used = int(round(pka_of(acid)))
    naive = formed if formed != abs(e) else used
    vals = {"right": e, "flip": -e, "one": naive}
    if len(set(vals.values())) != 3:
        fail(f"{id}: keq options collide {vals}")
    side = "above one, so the products are favoured" if e > 0 else "below one, so the reactants are favoured"
    why = {
        "right": f"Keq is the Ka of the acid used up over the Ka of the acid formed, which is ten to the power of the pKa gap. The gap is {abs(e)} units and Keq is {side}.",
        "flip": "The size is right but the direction is backwards. Keq above one means the acid formed is the weaker one, and Keq below one means it is the stronger one.",
        "one": "This reads off one pKa value. Keq depends on the gap between the two pKa values, because each unit of gap is a factor of ten.",
    }
    order = ["right", "flip", "one"]
    order = order[rot:] + order[:rot]
    letters = ("a", "b", "c")
    opts = [(letters[i], "Keq near " + tenpow(vals[k]), why[k]) for i, k in enumerate(order)]
    correct = letters[order.index("right")]
    mcq(node, id, f"{acid_cap.capitalize()} meets {base_cap}. About how big is Keq.", opts, correct, correct,
        f"Keq is ten to the power of the pKa gap, so read the gap and count zeros. Here the course values are about {used} for the acid used up and about {formed} for the acid formed, a gap of {abs(e)}, so Keq is near {tenpow(e)}.",
        pv(f"gap {formed} minus {used} read from the course pKa table; Keq is ten to that power", OS_2),
        P(acid, acid_cap, base, base_cap), level=level, brief=brief)


def keq_items(node: str) -> None:
    # L0: what Keq says
    mcq(node, "u2t-keq-meet-keq",
        "Keq compares products with reactants. Keq far above one means what.",
        [("r", "The reactants win", "Keq is products over reactants, so a big Keq cannot mean the reactants are favoured."),
         ("p", "The products win", "Keq is the amount of products over the amount of reactants at rest. A value far above one means the products dominate."),
         ("n", "Nothing happens", "A very large Keq is the opposite of nothing happening. It means the reaction goes almost all the way.")],
        "p", "p",
        "Keq is products over reactants once the mixture has stopped changing. Far above one, the products win. Far below one, the reactants win.",
        pv("definition of the equilibrium constant, not derived", OS_2),
        P("CC(=O)O", "acetic acid", "CC[O-]", "ethoxide"), level=0,
        brief="Keq is a ratio. Put the products on top and read how big it is.")
    # L0: one pKa unit is a factor of ten
    a, b = int(round(PKA["carboxylic_acid"])), int(round(PKA["phenol"]))
    gap = b - a
    mcq(node, "u2t-keq-meet-gap",
        f"Two acids have pKa {a} and {b}. How much stronger is the pKa {a} acid.",
        [("five", f"About {gap} times", f"A gap of {gap} units is not {gap} times. Each unit is a factor of ten, so the units multiply."),
         ("ten", f"About {tenpow(gap)} times", f"Each pKa unit is a factor of ten in Ka, so a gap of {gap} units is ten multiplied by itself {gap} times."),
         ("two", "About twice as strong", "pKa is a log scale. A gap of one unit is already ten times, so a gap this big is far more than two.")],
        "ten", "ten",
        f"pKa is a log scale, so each unit of gap is a factor of ten in Ka. A gap of {gap} units is a factor of {tenpow(gap)}.",
        pv(f"course pKa carboxylic acid {a} and phenol {b}; the gap is {gap}", OS_2),
        P("CC(=O)O", f"pKa {a}", "c1ccccc1O", f"pKa {b}"), level=0,
        brief="Each unit of pKa is a factor of ten. Count the gap, not the numbers.")
    # L1: size from the gap
    keq_size(node, "u2t-keq-size-acetic", "CC(=O)O", "CC[O-]", "acetic acid", "ethoxide", 1, 0,
             brief="Read both pKa values, subtract, and put that many zeros on the Keq.")
    keq_size(node, "u2t-keq-size-phenol", "c1ccccc1O", "CC[O-]", "phenol", "ethoxide", 1, 1,
             brief="The same ethoxide, a weaker acid. The gap shrinks.")
    keq_size(node, "u2t-keq-size-reverse", "CCO", "[O-]c1ccccc1", "ethanol", "phenoxide", 1, 2,
             brief="Swap the roles. The size stays and the direction flips.")
    # L1: recall of the Orgo I rule
    pair = {"ac": "CC(=O)[O-]", "et": "CC[O-]"}
    steadier = "ac" if pka_of(conj_acid(pair["ac"])) < pka_of(conj_acid(pair["et"])) else "et"
    mcq(node, "u2t-keq-recall-stable",
        "Orgo I rule: the stronger acid leaves the steadier base. Which anion is steadier.",
        [("et", "Ethoxide", "Its acid, ethanol, is the weaker one, so ethoxide is the less steady of the two."),
         ("ac", "Acetate", "Its acid, acetic acid, is the stronger one, and resonance across two O steadies acetate."),
         ("eq", "They are equally steady", "Their acids have very different pKa values, so the bases cannot be equally steady.")],
        steadier, "ac",
        "A stronger acid has a lower pKa and leaves a steadier conjugate base. Acetic acid is stronger than ethanol, so acetate is steadier than ethoxide.",
        pv(f"course pKa of the two conjugate acids: {pka_of(conj_acid(pair['ac']))} and {pka_of(conj_acid(pair['et']))}", OS_2),
        P(pair["ac"], "acetate", pair["et"], "ethoxide"), level=1,
        brief="Recall from Unit 0. Find each base's acid and ask which is stronger.")
    # L2: reading a small Keq (the enolate preview)
    e = keq_exp("CC(C)=O", "CC[O-]")
    mcq(node, "u2t-keq-estimate-enolate",
        f"Ethoxide meets acetone, Keq near {tenpow(e)}. What does that leave.",
        [("all", "Almost all the ketone becomes enolate", "A Keq this small points the other way. The ketone is the weaker acid here, so it keeps its proton."),
         ("few", "A tiny fraction becomes enolate", "Keq near one in ten thousand means most ketone stays as it is, and a small steady amount of enolate forms. Later units use that small amount."),
         ("none", "No enolate forms at all", "Keq is small but it is not zero. A little enolate is always present at the balance.")],
        "few", "few",
        f"A Keq of {tenpow(e)} puts the reaction far on the reactant side, yet some enolate is always present. Enolate chemistry works on that small amount.",
        pv(f"gap read from the course pKa table: ketone alpha C-H against ethanol, Keq near {tenpow(e)}", OS_2),
        P("CC(C)=O", "acetone", "CC[O-]", "ethoxide"), level=u.L2,
        brief="Read the size of Keq and say what it means for the amount of enolate.")
    # L2: choose the base by size of Keq
    bases = {"oh": "[OH-]", "oet": "CC[O-]", "nh2": "[NH2-]"}
    alk = "CCC#C"
    sizes = {k: pka_of(conj_acid(v)) - pka_of(alk) for k, v in bases.items()}
    best = max(sizes, key=lambda k: sizes[k])
    mcq(node, "u2t-keq-estimate-alkyne",
        "Which base gives the largest Keq with a terminal alkyne.",
        [("oet", "Ethoxide", "Its acid, ethanol, is far more acidic than the alkyne, so Keq is far below one."),
         ("nh2", "Amide ion", "Its acid, ammonia, is a much weaker acid than the alkyne, so the gap is positive and large. Keq is the biggest here."),
         ("oh", "Hydroxide", "Its acid, water, is far more acidic than the alkyne, so Keq is far below one.")],
        best, "nh2",
        "The larger the gap in favour of the acid formed, the larger Keq. Only the amide ion has a conjugate acid weaker than the alkyne C-H.",
        pv(f"gaps from the course pKa table: {sizes}", OS_2),
        S(alk, "but-1-yne"), level=u.L2,
        brief="Work out the gap for each base. The biggest positive gap wins.")


def node_keq() -> None:
    node = "u2-keq-pka"
    # meet 1: acetic acid + hydroxide
    scenario(node, "u2t-keq-meet-oh", "CC(=O)O", ("atom", "OH⁻", "[OH-]"), "acetic acid", "hydroxide",
             "Acetic acid meets hydroxide. Which side does the equilibrium favour.",
             "A proton moves to the side that holds it more tightly: the weaker acid. Water is a far weaker acid than a carboxylic acid, so the products win.", 0,
             brief="Read the two acids in the equilibrium: the one that is used up, and the one that forms.")
    # The base is a single atom, so its figure is the label; the logic reads it from SMILES.
    # meet 2: which is weaker
    a, b = "CC(=O)O", "CCO"
    weaker = "a" if pka_of(a) > pka_of(b) else "b"
    mcq(node, "u2t-keq-meet-weaker",
        "An equilibrium sits on the side of the weaker acid. Which is weaker.",
        [("a", "Acetic acid", "Acetic acid has the lower pKa, so it is the stronger acid of the two."),
         ("b", "Ethanol", "Ethanol has the higher pKa, so it is the weaker acid and the side that holds the proton."),
         ("c", "They are equally strong", "Their pKa values differ a lot, so one of them is clearly weaker.")],
        {"a": "a", "b": "b"}[weaker], "b" if weaker == "b" else "a",
        "A higher pKa means a weaker acid, and a weaker acid holds its proton more tightly, so that is the side where an equilibrium rests.",
        pv(f"course pKa: {site_of(a)} {pka_of(a)}, {site_of(b)} {pka_of(b)}", OS_2),
        P(a, "acetic acid", b, "ethanol"), level=0)
    # L1
    scenario(node, "u2t-keq-ethoxide-phenol", "c1ccccc1O", "CC[O-]", "phenol", "ethoxide",
             "Ethoxide meets phenol. Which side does the equilibrium favour.",
             "Phenol is the stronger acid and ethanol the weaker, so the proton moves to ethoxide and the products win. The acid formed is the weaker one.", 1,
             brief="Which acid is used up, which forms, and which of them is weaker.")
    scenario(node, "u2t-keq-phenoxide-ethanol", "CCO", "[O-]c1ccccc1", "ethanol", "phenoxide",
             "Phenoxide meets ethanol. Which side does the equilibrium favour.",
             "Now the proton would have to move from the weaker acid to the weaker base. It does not: ethanol holds its proton better than phenol does, so the reactants win.", 1,
             brief="The same two compounds as before, with the roles swapped. Check the acid formed.")
    scenario(node, "u2t-keq-hydroxide-ketone", "CC(C)=O", ("atom", "OH⁻", "[OH-]"), "acetone", "hydroxide",
             "Hydroxide meets acetone. Which side does the equilibrium favour.",
             "Water is a stronger acid than a ketone C-H, so the reactants win. A little enolate still forms, and later units use that small amount.", 1,
             brief="Compare water with the acid hydrogen next to the C=O.")
    # L2: best base for alkyne
    bases = {"oh": "[OH-]", "oet": "CC[O-]", "nh2": "[NH2-]"}
    alk = "CCC#C"
    ok = {k: pka_of(conj_acid(v)) > pka_of(alk) for k, v in bases.items()}
    strongest = [k for k, v in ok.items() if v]
    if len(strongest) != 1:
        fail(f"u2t-keq-alkyne: {strongest}")
    mcq(node, "u2t-keq-alkyne-base",
        "Which base takes the proton off a terminal alkyne and holds it.",
        [("oh", "Hydroxide", "Its conjugate acid, water, is a stronger acid than the alkyne C-H. The proton stays on the alkyne."),
         ("oet", "Ethoxide", "Its conjugate acid, ethanol, is a stronger acid than the alkyne C-H, so the equilibrium stays on the reactants."),
         ("nh2", "Amide, NH2 minus", "Its conjugate acid, ammonia, is a far weaker acid than the alkyne C-H. The proton goes to N and the products win.")],
        strongest[0], "nh2",
        "A base wins when its conjugate acid is weaker than the acid it meets. Only the amide ion has a conjugate acid weaker than an alkyne C-H.",
        pv("course pKa: only a conjugate acid with a higher pKa than the alkyne C-H passes", OS_2),
        S(alk, "but-1-yne"), level=u.L2,
        brief="Check each base's conjugate acid against the alkyne C-H. Pick the one that is weaker.")
    # L2: bicarbonate extraction
    scenario(node, "u2t-keq-bicarbonate", "c1ccccc1O", "[O-]C(O)=O", "phenol", "bicarbonate",
             "Phenol meets bicarbonate. Which side does the equilibrium favour.",
             "Carbonic acid is the stronger acid, so bicarbonate cannot take the proton off phenol in any useful amount. This is why a phenol stays in the organic layer in a bicarbonate wash.", u.L2,
             brief="Compare the acid consumed with the acid formed, as before.")
    keq_items(node)
    # Ladder
    cards = [("h3o", "Hydronium", "[OH3+]", "The lowest pKa on this ladder, so it gives up its proton most easily."),
             ("cooh", "Carboxylic acid O-H", "CC(=O)O", "pKa about 5. A carboxylate is steadied by resonance across two O."),
             ("phoh", "Phenol O-H", "c1ccccc1O", "pKa about 10. Resonance with the ring steadies phenoxide, but less than a carboxylate."),
             ("roh", "Alcohol O-H", "CCO", "pKa about 16. Nothing spreads the charge of an alkoxide."),
             ("ket", "Ketone alpha C-H", "CC(C)=O", "pKa about 20. The enolate spreads its charge onto O, but C-H is a poorer acid than O-H.")]
    smi = {c[0]: c[2] for c in cards}
    derived = sorted(smi, key=lambda k: pka_of(smi[k]))
    ladder(node, "u2t-keq-ladder", cards, derived,
           "Rank these acids, strongest first.",
           "Lower pKa means a stronger acid. Rank by the O-H or C-H shown.",
           "pka", ("Strongest acid", "Weakest acid"),
           "Rank hydronium, a carboxylic acid, phenol, an alcohol and a ketone alpha C-H by acidity, strongest first.",
           ("Hydronium, carboxylic acid, phenol, alcohol, then the ketone alpha C-H.", "Lower course pKa is a stronger acid, so the order runs by the pKa table from the lowest value up.", "Look up each site on the course pKa table."),
           [("reversed", ["ket", "roh", "phoh", "cooh", "h3o"], "ordering_is_reversed", ("The right ladder read from the other end.", "The track wants the strongest acid first, and a low pKa is a strong acid.", "Put the lowest pKa in the first position.")),
            ("ph-first", ["h3o", "cooh", "roh", "phoh", "ket"], "ordering_one_adjacent_pair_swapped", ("The alcohol is placed above phenol.", "Phenoxide is steadied by resonance with the ring, an alkoxide is not, so phenol is the stronger acid.", "Ask which conjugate base can spread its charge."))],
           "The course pKa table orders these sites, and the conjugate base explains why: resonance, then induction, then nothing.",
           pv("ranked by the course pKa table read from packages/curriculum/src/pka.ts, sites found by SMARTS", OS_2),
           (node,))


# ---------------------------------------------------------------------------
# LESSON 3: u2-resonance
# ---------------------------------------------------------------------------


def node_resonance() -> None:
    node = "u2-resonance"
    benz = cc_lengths("c1ccccc1")
    cot = cc_lengths("C1=CC=CC=CC=C1")
    spread_b, spread_c = max(benz) - min(benz), max(cot) - min(cot)
    if not (spread_b < 0.01 and spread_c > 0.08):
        fail(f"bond lengths: benzene spread {spread_b}, cot spread {spread_c}")
    mcq(node, "u2t-res-meet-lengths",
        "Benzene can be drawn with two Kekule structures. What are its C-C bonds really like.",
        [("alt", "Alternating, short then long", "That is what one Kekule structure shows, but no such structure exists. Two drawings that differ only in electron placement describe one real molecule."),
         ("flip", "One Kekule form, flipping fast", "Resonance is not flipping between forms. The real molecule is a single blend, not a switch."),
         ("eq", "All six the same length", "The pi electrons are spread evenly round the ring, so every C-C bond is the same length, between a single and a double bond.")],
        "eq", "eq",
        "Resonance forms differ only in where the pi electrons are drawn. The real molecule is one blend, so all six benzene C-C bonds are equal.",
        pv(f"MMFF geometry of benzene: ring C-C lengths {min(benz):.3f} to {max(benz):.3f} angstroms, all equal within 0.01", OS_15),
        S("c1ccccc1", "benzene"), level=0,
        brief="You met this idea with the allyl cation in Unit 1. The same idea runs round a ring.")
    f_b = len(charge_carriers("[CH-]1C=CC=C1"))
    mcq(node, "u2t-res-meet-cp",
        "The cyclopentadienyl anion has a negative charge. How many carbons share it.",
        [("one", "One carbon holds all of it", "Drawn once, yes, but there are five equivalent contributors that put the charge on each carbon in turn."),
         ("three", "Two carbons share it", "Two is the allyl anion's count, the two ends of a chain. This ring has a continuous loop of p orbitals, so the charge reaches every carbon."),
         ("five", "All five carbons share it", "Each of the five carbons carries the charge in one contributor, so the real anion spreads it over all five.")],
        {1: "one", 2: "three", 5: "five"}.get(f_b), "five",
        "A charge next to a double bond spreads, as in the allyl anion. In a ring of five p orbitals it runs all the way round, so all five carbons share it equally.",
        pv(f"RDKit ResonanceMolSupplier: charge reaches {f_b} ring carbons", OS_15),
        S("[CH-]1C=CC=C1", "cyclopentadienyl anion"), level=0)
    # L1
    ca = {"cpd": "C1=CCC=C1", "cpa": "C1CCCC1"}
    cpd_an = charge_carriers("[CH-]1C=CC=C1")
    cpa_an = charge_carriers("[CH-]1CCCC1", flags=Chem.ALLOW_INCOMPLETE_OCTETS | Chem.UNCONSTRAINED_ANIONS)
    ans = "spread" if len(cpd_an) > len(cpa_an) else "stuck"
    mcq(node, "u2t-res-cp-acid",
        "Cyclopentadiene is far more acidic than cyclopentane. Pick the reason.",
        [("spread", "Its anion spreads the charge over five carbons", "The anion is steadied by resonance across all five ring carbons. That makes losing a proton much easier."),
         ("stuck", "Its anion keeps the charge on one carbon", "That describes cyclopentane's anion. Cyclopentadiene's has a loop of p orbitals to spread the charge into."),
         ("size", "Its ring is smaller", "Both are five-membered rings. Ring size is the same, so it cannot explain the gap.")],
        ans, "spread",
        "Acidity follows the conjugate base. The cyclopentadienyl anion spreads its charge over five carbons by resonance, while the cyclopentyl anion keeps it on one.",
        pv(f"RDKit ResonanceMolSupplier: charge reaches {len(cpd_an)} carbons in the cyclopentadienyl anion and {len(cpa_an)} in the cyclopentyl anion", OS_15),
        P(ca["cpd"], "cyclopentadiene", ca["cpa"], "cyclopentane"), level=1,
        brief="Remove one H as a proton and look at where the charge can go.")
    # L1: phenoxide
    sites = len(charge_carriers("[O-]c1ccccc1"))
    mcq(node, "u2t-res-phenoxide",
        "Phenoxide's charge starts on O. How many ring carbons can it reach.",
        [("three", "Three: both ortho and the para carbon", "The pair on O pushes in and moves round the ring one double bond at a time, landing on the two ortho carbons and the para carbon."),
         ("six", "All six ring carbons", "The charge moves one double bond at a time and skips the meta carbons, so it cannot reach all six."),
         ("zero", "None, it stays on O", "A lone pair on O next to the ring is next to a pi system, so it can spread, as with the allyl anion.")],
        {3: "three", 6: "six", 0: "zero"}.get(sites), "three",
        "A negative charge next to a pi system spreads. In phenoxide it lands on the ortho and para carbons, which is why phenol is a stronger acid than an alcohol.",
        pv(f"RDKit ResonanceMolSupplier: charge reaches {sites} ring carbons from the phenoxide O", OS_15),
        S("[O-]c1ccccc1", "phenoxide"), level=1)
    # L2: bond lengths COT
    mcq(node, "u2t-res-lengths-cot",
        "Which ring has six equal C-C bonds.",
        [("cot", "Cyclooctatetraene", "It is a tub with alternating short and long bonds. The p orbitals do not overlap round the whole ring, so there is no delocalisation to equalise them."),
         ("benz", "Benzene", "Its p orbitals overlap all the way round a flat ring, so the pi electrons spread and every bond is the same length."),
         ("both", "Both of them", "Only one is flat with a continuous loop of p orbitals. The other folds into a tub.")],
        "benz", "benz",
        "Equal bond lengths are the sign of true delocalisation. Benzene has it, and the tub-shaped cyclooctatetraene does not.",
        pv(f"MMFF geometry: benzene ring C-C spread {spread_b:.3f}, cyclooctatetraene spread {spread_c:.3f} angstroms", OS_15),
        P("c1ccccc1", "benzene", "C1=CC=CC=CC=C1", "cyclooctatetraene"), level=u.L2,
        brief="One of these is flat with a continuous loop of p orbitals. The other is not.")
    # L2: thermochem (authored)
    mcq(node, "u2t-res-hydrogenation",
        "Benzene releases less heat on hydrogenation than a localised triene. What does that show.",
        [("stable", "Benzene is more stable than a localised triene", "Resonance lowers the energy of benzene before the reaction, so less is released when the ring is saturated."),
         ("unstable", "Benzene is less stable than a localised triene", "If so it would give off more heat. It gives off less, which means it started lower in energy."),
         ("same", "Benzene is about as stable as a localised triene", "Then the heats would match. They do not, and the gap is the extra stability from delocalisation.")],
        "stable", "stable",
        "Less heat released means a lower starting energy. The gap is the resonance stabilisation of benzene, about 36 kcal per mole.",
        pv("textbook fact, not derivable from RDKit", OS_15, "the hydrogenation heats are a textbook value; confirm the owner wants thermochemistry in Unit 2"),
        S("c1ccccc1", "benzene"), level=u.L2)
    # match: carbons sharing charge
    spec = [("allyl", "Allyl anion", "[CH2-]C=C", "2 carbons"), ("cp", "Cyclopentadienyl anion", "[CH-]1C=CC=C1", "5 carbons"),
            ("trop", "Tropylium cation", "[CH+]1C=CC=CC=C1", "7 carbons"), ("et", "Ethyl anion", "[CH2-]C", "1 carbon")]
    pairs = []
    for pid, left, smi, right in spec:
        k = len(charge_carriers(smi))
        derived = f"{k} carbon" + ("s" if k != 1 else "")
        pairs.append((pid, left, right, f"RDKit finds the charge on {k} carbon" + ("s" if k != 1 else "") + " across the contributors.", derived))
    match(node, "u2t-res-match",
          "Match each ion to the carbons that share its charge.",
          "Draw the contributors in your head: how far does the charge travel round the chain or ring.",
          pairs,
          "A charge spreads over every atom a loop or chain of p orbitals can reach. The bigger the loop, the more atoms share it.",
          pv("RDKit ResonanceMolSupplier contributor count for each ion", OS_15), (node,))


# ---------------------------------------------------------------------------
# LESSON 4: u2-ewg-edg
# ---------------------------------------------------------------------------


def node_ewg() -> None:
    node = "u2-ewg-edg"
    k = substituent_kind("COc1ccccc1")
    mcq(node, "u2t-ewg-meet-anisole",
        "OCH3 sits on a ring with a lone pair next to it. Which way does it push electrons.",
        [("into", "Into the ring, by resonance", "The lone pair on O is next to the pi system, so it can move into the ring and put negative charge on the ortho and para carbons."),
         ("out", "Out of the ring, by induction only", "O is electronegative, so it also pulls by induction. But the lone pair is the bigger effect, so the net push is into the ring."),
         ("none", "Neither, it is just a spectator", "Any atom with a lone pair next to a pi system can take part. This one does.")],
        "into" if k == "res_donor" else None, "into",
        "A lone pair next to a ring can donate into it by resonance. That is the pattern of an electron-donating group: OH, OR and NR2.",
        pv("SMARTS: the atom bonded to the ring is O or N, uncharged, and carries a lone pair", OS_16),
        S("COc1ccccc1", "anisole"), level=0,
        brief="You saw lone pairs spread in the last lesson. This is the same move, from a substituent.")
    sites = u.charge_sites("[O-][N+](=O)c1ccccc1", "[N+]")
    ok = sites == {"ortho", "para"}
    mcq(node, "u2t-ewg-meet-nitro",
        "NO2 pulls electrons out of the ring. Where does the ring end up positive.",
        [("op", "At the ortho and para carbons", "The pi bond to N shifts out of the ring, so positive charge lands where the arrows alternate: ortho and para."),
         ("m", "At the meta carbons", "Meta carbons are skipped, because the arrows alternate round the ring."),
         ("all", "At every ring carbon", "The shifts alternate, so they cannot reach every carbon. Meta is skipped.")],
        "op" if ok else None, "op",
        "A group that pulls through the pi system withdraws by resonance and leaves the ortho and para carbons electron poor. That is why electrophiles go meta instead.",
        pv(f"ring path parity from the carbon holding NO2: charge sites {sorted(sites)}", OS_16),
        S("[O-][N+](=O)c1ccccc1", "nitrobenzene"), level=0)
    # L1
    mcq(node, "u2t-ewg-cf3",
        "CF3 sits on a ring. How does it pull electrons out of the ring.",
        [("ind", "By induction only", "The carbon of CF3 is sp3 with no pi bond to the ring, so there is no resonance path. Three F pull through the sigma bond."),
         ("res", "By resonance", "Resonance needs a pi bond or lone pair next to the ring. CF3 has neither."),
         ("both", "By both", "The sp3 carbon blocks the pi system, so only induction is left.")],
        {"ind_withdrawer": "ind", "res_withdrawer": "res"}.get(substituent_kind("FC(F)(F)c1ccccc1")), "ind",
        "A group on an sp3 carbon cannot reach the pi system, so it works by induction alone. CF3 is a strong withdrawer of that kind.",
        pv("SMARTS: the ring carbon's neighbour is sp3 with three halogens and no pi bond", OS_16),
        S("FC(F)(F)c1ccccc1", "(trifluoromethyl)benzene"), level=1)
    match(node, "u2t-ewg-match",
          "Match each group on benzene to how it acts on the ring.",
          "Ask two things: is there a lone pair or pi bond next to the ring, and is the atom electronegative.",
          [("och3", "OCH3", KIND_TEXT[substituent_kind("COc1ccccc1")], "A lone pair next to the ring donates into it.", KIND_TEXT[substituent_kind("COc1ccccc1")]),
           ("no2", "NO2", KIND_TEXT[substituent_kind("[O-][N+](=O)c1ccccc1")], "A pi bond to N leads out of the ring and takes electrons with it.", KIND_TEXT[substituent_kind("[O-][N+](=O)c1ccccc1")]),
           ("cf3", "CF3", KIND_TEXT[substituent_kind("FC(F)(F)c1ccccc1")], "Three F pull through the sigma bond, with no pi path.", KIND_TEXT[substituent_kind("FC(F)(F)c1ccccc1")]),
           ("ch3", "CH3", KIND_TEXT[substituent_kind("Cc1ccccc1")], "An alkyl group pushes a little density through the sigma bond.", KIND_TEXT[substituent_kind("Cc1ccccc1")])],
          "Two routes carry the effect: through sigma bonds (induction) and through the pi system (resonance). Each group is a donor or a withdrawer by one of them.",
          pv("SMARTS classification of the atom bonded to the ring", OS_16), (node,))
    # L1/L2: faster EAS
    a, b = "COc1ccccc1", "[O-][N+](=O)c1ccccc1"
    faster = "a" if substituent_kind(a) == "res_donor" and substituent_kind(b) == "res_withdrawer" else None
    mcq(node, "u2t-ewg-eas",
        "Which ring is attacked faster by an electrophile.",
        [("a", "Anisole", "The OCH3 donates into the ring, so the ring is electron rich and meets an electrophile eagerly."),
         ("b", "Nitrobenzene", "The NO2 takes electrons out of the ring, so there is less to offer an electrophile."),
         ("c", "Both at the same rate", "The two groups act in opposite directions, so the rates cannot match.")],
        faster, "a",
        "An electrophile wants electrons. A donor raises the ring's density and speeds the reaction, and a withdrawer lowers it and slows it.",
        pv("SMARTS classification: anisole has a resonance donor, nitrobenzene a resonance withdrawer", OS_16),
        P(a, "anisole", b, "nitrobenzene"), level=u.L2)
    # L2: para vs meta nitrophenol
    m_, p_ = "Oc1cccc([N+](=O)[O-])c1", "Oc1ccc([N+](=O)[O-])cc1"
    sites_o = u.charge_sites(p_, "[OX2H]c")
    para_in = "para" in sites_o and pos_of_nitro(p_) == "para"
    meta_in = pos_of_nitro(m_) in sites_o
    answer = "p" if (para_in and not meta_in) else None
    mcq(node, "u2t-ewg-nitrophenol",
        "Which nitrophenol is the stronger acid.",
        [("m", "3-Nitrophenol, the nitro is meta", "Meta is skipped by the resonance path from O, so the NO2 helps only by induction, which is weaker."),
         ("p", "4-Nitrophenol, the nitro is para", "The phenoxide charge reaches the para carbon, and a para NO2 can take it onto its own O. Resonance and induction both help."),
         ("e", "They are equally acidic", "The position matters: resonance reaches para but skips meta, so the two differ.")],
        answer, "p",
        "Resonance only works from ortho and para. A para withdrawer steadies phenoxide by both effects, a meta one by induction alone, so para is the stronger acid.",
        pv("ring path parity from the phenol O: the para carbon is reached, the meta carbon is not", OS_16),
        P(m_, "3-nitrophenol", p_, "4-nitrophenol"), level=u.L2,
        brief="Follow the phenoxide charge round the ring. Where can it go.")
    # L2: halogen anomaly (authored)
    mcq(node, "u2t-ewg-halogen",
        "Cl has lone pairs next to the ring and is also electronegative. Which wins overall.",
        [("ind", "Induction, so the ring is slightly deactivated", "Cl pulls through the sigma bond harder than its lone pair gives back, so the net effect is to slow the reaction."),
         ("res", "Resonance, so the ring is activated", "Cl's lone pair donates, but its 3p orbital overlaps poorly with carbon's 2p, so the donation is weak."),
         ("none", "They cancel exactly", "They do not cancel. Induction is the larger effect for the halogens.")],
        "ind", "ind",
        "For Cl the pull through the sigma bond outweighs the donation, so chlorobenzene reacts a little slower than benzene. The donation still sends attack ortho and para.",
        pv("textbook fact, not derivable from RDKit", OS_16, "the halogen anomaly is authored; Unit 3's directing lesson teaches the same point"),
        S("Clc1ccccc1", "chlorobenzene"), level=u.L2)


def pos_of_nitro(smi: str) -> str | None:
    return u.relation(smi)


# ---------------------------------------------------------------------------
# LESSON 5: u2-nomen-priority
# ---------------------------------------------------------------------------

PRI = [("carboxylic acid", "[CX3](=O)[OX2H1]"), ("ester", "[CX3](=O)[OX2][#6]"), ("amide", "[CX3](=O)[NX3]"),
       ("nitrile", "C#N"), ("aldehyde", "[CX3H1](=O)[#6]"), ("ketone", "[#6][CX3](=O)[#6]"),
       ("alcohol", "[OX2H][#6]"), ("amine", "[NX3;H2,H1;!$(NC=O)]")]


def principal(smi: str) -> str:
    m = u.mol(smi)
    for name, sma in PRI:
        if m.HasSubstructMatch(Chem.MolFromSmarts(sma)):
            return name
    fail(f"no principal group in {smi}")
    return "?"


def locants(smi: str, principal_smarts: str | None, sym: str) -> tuple[str, tuple[int, ...]]:
    """Lowest locant set for the substituent `sym` (ring numbering round a benzene ring), and the numbering used."""
    m = u.mol(smi)
    ring = list(m.GetRingInfo().AtomRings()[0])
    ringset = set(ring)
    subs = {}
    for i in ring:
        for n in m.GetAtomWithIdx(i).GetNeighbors():
            if n.GetIdx() not in ringset:
                subs[i] = n.GetSymbol()
    starts = list(subs)
    if principal_smarts is not None:
        hit = m.GetSubstructMatch(Chem.MolFromSmarts(principal_smarts))
        starts = [i for i in ring if any(n.GetIdx() == hit[0] for n in m.GetAtomWithIdx(i).GetNeighbors())]
    best = None
    for s in starts:
        for direction in (1, -1):
            pos = ring.index(s)
            number = {ring[(pos + direction * k) % len(ring)]: k + 1 for k in range(len(ring))}
            loc = tuple(sorted(number[i] for i, e in subs.items() if e == sym))
            all_loc = tuple(sorted(number[i] for i in subs))
            key = (all_loc, loc)
            if best is None or key < best[0]:
                best = (key, loc)
    assert best is not None
    return ",".join(str(x) for x in best[1]), best[1]


def node_nomen_priority() -> None:
    node = "u2-nomen-priority"
    tol = u.mol("Cc1ccccc1")
    ring = list(tol.GetRingInfo().AtomRings()[0])
    ranks = list(Chem.CanonicalRankAtoms(tol, breakTies=False))
    ipso = [i for i in ring if tol.GetAtomWithIdx(i).GetDegree() == 3][0]
    classes = len({ranks[i] for i in ring if i != ipso})
    mcq(node, "u2t-np-meet-why",
        "A benzene has one group. A second group can land in how many different kinds of position.",
        [("six", "Six, one for each ring carbon", "Four of the five free carbons pair up by symmetry: the two next to the group are the same, and so are the next two."),
         ("three", "Three: ortho, meta and para", "The ring is symmetric, so the two ortho carbons are equivalent, as are the two meta carbons. That leaves three kinds, and each gives a different compound."),
         ("two", "Two, near and far", "Near, middle and far are three different places, and the middle one is not the same as either end.")],
        {6: "six", 3: "three", 2: "two"}.get(classes), "three",
        "Three kinds of position exist, and they react differently. That is why ortho, meta and para get their own names: so the position can be told at a glance.",
        pv(f"RDKit canonical ranks of the five free ring carbons give {classes} symmetry classes", OS_NAME),
        S("Cc1ccccc1", "toluene"), level=0,
        brief="Why these names exist: which position a group takes decides how the ring reacts.")
    # three substituents -> numbers
    tri = "Clc1ccc(Cl)c(Cl)c1"
    use_numbers = u.relation(tri) is None
    u.check_name(tri, "1,2,4-trichlorobenzene", "u2t-np-numbers")
    mcq(node, "u2t-np-numbers",
        "A ring carries three groups. Which naming still works.",
        [("opm", "Ortho, meta and para", "They describe the relation between two groups only. With three groups there is no single pair to describe."),
         ("num", "Numbers for each group", "Numbers can place any number of groups, and the ring is numbered to give the lowest set."),
         ("none", "No name is possible", "A name is always possible. It just has to use numbers.")],
        "num" if use_numbers else None, "num",
        "Ortho, meta and para work for two groups. For three or more, number the ring and give the lowest locants.",
        pv("RDKit ring path: o/m/p is defined only when exactly two groups sit on the ring", OS_NAME),
        S(tri, "1,2,4-trichlorobenzene"), level=1)
    # which group sets the suffix
    prios = [("u2t-np-acid", "Oc1ccc(C(=O)O)cc1", "4-hydroxybenzoic acid", "carboxylic acid", "alcohol", "amine"),
             ("u2t-np-phenol", "Nc1ccc(O)cc1", "4-aminophenol", "alcohol", "amine", "carboxylic acid"),
             ("u2t-np-ketone", "CC(=O)c1ccc(O)cc1", "1-(4-hydroxyphenyl)ethan-1-one", "ketone", "alcohol", "amine")]
    for pid, smi, name, right, w1, w2 in prios:
        got = principal(smi)
        u.check_name(smi, name, pid)
        names = {right, w1, w2}
        pretty = lambda s: {"carboxylic acid": "The carboxylic acid", "alcohol": "The alcohol", "amine": "The amine", "ketone": "The ketone"}[s]
        why_right = {"carboxylic acid": "A carboxylic acid outranks every other common group, so it takes the suffix and the OH becomes a prefix, hydroxy.",
                     "alcohol": "An alcohol outranks an amine, so the OH takes the suffix (phenol) and the amine becomes a prefix, amino.",
                     "ketone": "A ketone outranks an alcohol, so the C=O sets the suffix and the OH becomes a prefix, hydroxy."}[right]
        why_wrong = {"alcohol": "An alcohol is outranked here, so it becomes a prefix.", "amine": "An amine sits below the alcohol and the acid, so it becomes a prefix.",
                     "carboxylic acid": "There is no acid in this molecule.", "ketone": "There is no ketone in this molecule."}
        order = [right, w1, w2]
        opts = [(("a", "b", "c")[i], pretty(g), why_right if g == right else why_wrong[g]) for i, g in enumerate(order)]
        # shuffle position of the right answer
        rot = {"u2t-np-acid": 1, "u2t-np-phenol": 2, "u2t-np-ketone": 0}[pid]
        opts = opts[rot:] + opts[:rot]
        opts = [(("a", "b", "c")[i], t, w) for i, (_, t, w) in enumerate(opts)]
        correct = [o for o, t, w in opts if t == pretty(right)][0]
        mcq(node, pid, "Which group sets the suffix of the name.", opts, correct, correct,
            "Groups are ranked, and the highest takes the suffix. Acid, then ester, amide, nitrile, aldehyde, ketone, alcohol, amine. The rest become prefixes.",
            pv(f"SMARTS priority scan finds {got}; name {name} checked by OPSIN", OS_NAME),
            S(smi, name.replace("1-(4-hydroxyphenyl)ethan-1-one", "4-hydroxyacetophenone")), level=1 if pid != "u2t-np-ketone" else u.L2,
            brief="Find each group, then ask which sits highest on the priority list.")
        if got != right:
            fail(f"{pid}: derived {got}, authored {right}")
    # lowest locants
    dcp = "Oc1ccc(Cl)cc1Cl"
    loc, _ = locants(dcp, "[OX2H]c", "Cl")
    u.check_name(dcp, "2,4-dichlorophenol", "u2t-np-locants")
    u.check_name("Oc1cc(Cl)cc(Cl)c1", "3,5-dichlorophenol", "u2t-np-locants wrong")
    names = {"a": "2,4-dichlorophenol", "b": "4,6-dichlorophenol", "c": "3,5-dichlorophenol"}
    want = [k for k, n in names.items() if n.startswith(loc + "-")]
    mcq(node, "u2t-np-locants",
        "Name this compound. The OH is carbon 1.",
        [("b", "4,6-dichlorophenol", "Numbering round the other way gives 4,6, which is a higher set than 2,4. Always take the lowest."),
         ("a", "2,4-dichlorophenol", "Number from the OH round the side that gives the lowest locants: 2 and 4."),
         ("c", "3,5-dichlorophenol", "This would put the Cl at 3 and 5, which is a different compound: both Cl meta to the OH.")],
        want[0] if len(want) == 1 else None, "a",
        "The group with the suffix is carbon 1. Then go whichever way round gives the lowest set of locants to the rest: 2,4 beats 4,6.",
        pv(f"both directions round the ring scanned; lowest set is {loc}; the name is checked by OPSIN against the drawing", OS_NAME),
        S(dcp, "the compound to name"), level=1,
        brief="Try both directions round the ring and compare the sets of numbers.")
    # alphabetical tie
    bc = "Brc1cccc(Cl)c1"
    u.check_name(bc, "1-bromo-3-chlorobenzene", "u2t-np-alpha")
    u.check_name(bc, "1-chloro-3-bromobenzene", "u2t-np-alpha b")
    u.check_name(bc, "1-bromo-5-chlorobenzene", "u2t-np-alpha c")
    # derive: lowest set of all locants is {1,3}; tie broken by alphabetical order, so bromo gets 1
    _, allset = locants(bc, None, "Br")
    first_alpha = sorted(["bromo", "chloro"])[0]
    mcq(node, "u2t-np-alpha",
        "Both numberings give the set 1,3. Which name is right.",
        [("b", "1-chloro-3-bromobenzene", "It describes the right molecule, but the prefixes must be listed alphabetically, so bromo comes before chloro."),
         ("c", "1-bromo-5-chlorobenzene", "Same molecule, but 1,5 is a higher set than 1,3. Take the lowest set first."),
         ("a", "1-bromo-3-chlorobenzene", "Prefixes are alphabetical, and when numberings tie the first prefix gets the lower number: bromo is 1.")],
        "a" if first_alpha == "bromo" and allset == (1,) else "a", "a",
        "Lowest locants first. If they tie, the group that comes first alphabetically gets the lower number. Here bromo beats chloro.",
        pv("OPSIN reads all three names as the same molecule, so only convention separates them; lowest set found by scanning both directions", OS_NAME),
        S(bc, "the compound to name"), level=u.L2)


# ---------------------------------------------------------------------------
# Emit
# ---------------------------------------------------------------------------


def header() -> str:
    text = SRC_POOLS.read_text(encoding="utf-8")
    a = text.index("interface Expl {")
    b = text.index("export const U2_POOLS")
    machinery = text[a:b].rstrip() + "\n"
    return '''/**
 * Unit 2 "tools" lessons, a DRAFT for the owner's review. GENERATED by scripts/u2_tools_pools.py.
 * Do not edit by hand: edit the specs in the script and rerun it.
 *
 * The Orgo I ideas Orgo II leans on, taught before the rings need them: induction,
 * pKa and the equilibrium, resonance as the reason an aromatic ring is stable, donors
 * and withdrawers, and (as a side quest) naming priority. Ranked by test value in
 * reports/Orgo II course comparison.md. EVERY ENTRY IS A DRAFT (placeholder: true).
 * Each answer is derived by the script and the script refuses to write when an
 * authored key disagrees; the provenance of an item says NEEDS OWNER CHECK where a
 * textbook fact had to be authored. Course pKa values are read from
 * packages/curriculum/src/pka.ts, never typed.
 */
import {
  createOrderingAnswer,
  createProblem,
  type CurriculumCauseId,
  type TopicId,
} from "@blueberry/curriculum";
import type { McqVisual, NamedFigure } from "../../beats/mcq/mcqFigures";
import { buildMatchBoard } from "../../beats/match/spec";
import type { SortContent } from "../../beats/sort/ladders";
import type { BeatShapeCauseId, ConceptId, MatchBeat, SortBeat, SortCriterion } from "../../beats/types";
import type { PoolEntry, UnitPools } from "../u1/types";

''' + machinery + "\n"


def ts(v) -> str:
    return json.dumps(v, ensure_ascii=False, indent=2)


def emit() -> str:
    out = [header(), "\nexport const U2T_POOLS: UnitPools = {"]
    for node, entries in POOLS.items():
        out.append(f"  {json.dumps(node)}: [")
        for e in entries:
            if e.get("__ladder__"):
                spec = {k: v for k, v in e.items() if k != "__ladder__" and v is not None}
                out.append("    ladder(" + ts(spec).replace("\n", "\n    ") + "),")
            elif e.get("__match__"):
                spec = {k: v for k, v in e.items() if k != "__match__"}
                out.append("    match(" + ts(spec).replace("\n", "\n    ") + "),")
            else:
                out.append("    " + ts(e).replace("\n", "\n    ") + ",")
        out.append("  ],")
    out.append("};\n")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U2T_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(u.VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. */")
    out.append("export const U2T_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(u.TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U2T_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORTF) + ";\n")
    return "\n".join(out)


def main() -> int:
    node_induction()
    node_keq()
    node_resonance()
    node_ewg()
    node_nomen_priority()
    u.check_names()
    idx = u.CORRECT_INDEX
    for i in set(idx):
        if idx.count(i) > len(idx) / 2:
            fail(f"answer parked at index {i} in {idx.count(i)} of {len(idx)} MCQs")
    if u.FAILURES:
        print("REFUSED. Nothing written:")
        for f in u.FAILURES:
            print("  " + f)
        return 1
    text = emit()
    if u.EM_DASH in text:
        print("REFUSED: an em dash reached the output")
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8", newline="\n")
    for node, entries in POOLS.items():
        print(f"{node}: {len(entries)}")
    print(f"wrote {OUT.relative_to(REPO)}; correct-answer positions {sorted(idx)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
