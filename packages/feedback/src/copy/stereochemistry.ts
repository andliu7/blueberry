/**
 * Category: stereochemistry. Six causes, four blocking and two advisory.
 *
 * The two advisory ones are graded chemistry, not errors. CLAUDE.md is explicit
 * that syn periplanar E2 is real in conformationally locked systems and is
 * flagged as needing an authored justification rather than rejected, and that
 * SN1 is stereorandom at the reaction centre but is never asserted as 50:50.
 * Their copy says so in those words and does not read as a refusal.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type StereochemistryCauseId = Extract<
  CauseId,
  | "sn2_did_not_invert"
  | "addition_face_wrong"
  | "e2_not_periplanar"
  | "e2_syn_periplanar_unjustified"
  | "stereocenter_created_without_declared_geometry"
  | "stereochemistry_asserted_as_single_product_at_sn1_center"
>;

export const STEREOCHEMISTRY_COPY: Readonly<Record<StereochemistryCauseId, CauseCopy>> =
  Object.freeze({
    sn2_did_not_invert: {
      whatYouDid: "The carbon the nucleophile attacked kept the same arrangement of groups.",
      why: "In SN2 the nucleophile comes in on the opposite side from the leaving group, because that is the approach that lines up with the antibonding orbital of the bond being broken. The other three groups fold through as it does, like an umbrella in wind. Inversion here is geometry, not a tendency.",
      lookAt: "Redraw the centre with the nucleophile in the position opposite where the leaving group was, then flip the other three groups over to the other side. If the priority order of those groups has not changed, the descriptor goes from R to S or from S to R.",
    },
    addition_face_wrong: {
      whatYouDid: "Both new groups went onto the same face of the alkene.",
      why: "Bromination goes through a cyclic bromonium ion that covers one face completely, so the bromide has to open it from the opposite side. That makes the addition anti.",
      lookAt: "Track which face the first bromine bridged, then bring the bromide in on the other one. Anti addition to cis-2-butene gives the racemic pair of 2,3-dibromobutane, and anti addition to trans-2-butene gives the meso compound. If yours came out the other way round, the second bromide went in on the bridged face.",
    },
    e2_not_periplanar: {
      whatYouDid: "The proton taken here is not aligned with the leaving group.",
      why: "E2 makes the pi bond in the same motion as it breaks the carbon to hydrogen and carbon to leaving group bonds, so those two bonds have to lie in one plane with the two carbons. That means a dihedral near 180 degrees or near 0. Anything in between leaves the orbitals unable to overlap.",
      lookAt: "Draw the Newman projection down the two carbons and rotate until the leaving group is anti to a hydrogen. Whichever hydrogen ends up there is the one that leaves, and that is what decides which alkene you get.",
    },
    e2_syn_periplanar_unjustified: {
      whatYouDid: "You ran an E2 with the proton and the leaving group on the same side, syn periplanar.",
      why: "This is real chemistry rather than an error. Syn elimination happens when a ring or a cage stops the molecule from ever reaching the anti arrangement. It is slower than anti wherever the molecule has the choice, so it needs a reason before it is the route you draw.",
      lookAt: "Say what stops anti periplanar here. In a rigid bicycle or a fused ring the leaving group can have no anti hydrogen at all, and that is the justification. If a single bond rotation would give you anti, use anti instead.",
    },
    stereocenter_created_without_declared_geometry: {
      whatYouDid: "This step makes a new stereocenter and leaves it undefined.",
      why: "A carbon carrying four different groups exists as two arrangements that cannot be superimposed, and they are different compounds. Drawing it flat does not average them, it just does not say which one you made.",
      lookAt: "Ask which face the incoming group approached from. If one face is blocked, the wedge and dash follow from that. If both faces are open, both products form and you should draw both.",
    },
    stereochemistry_asserted_as_single_product_at_sn1_center: {
      whatYouDid: "You drew one arrangement at a centre that went through a carbocation.",
      why: "That carbon is planar in the cation, so the nucleophile can arrive from either face and both products form. The leaving group stays close as an ion pair long enough to shield the face it left from, so the inverted product is usually in excess, but the other one is still there.",
      lookAt: "Draw both products. How large the excess is depends on the substrate, the solvent, and how fast the leaving group diffuses away, so do not put a number on the ratio unless the question gives you one.",
    },
  });
