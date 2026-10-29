import type { EnergyProfile } from "./energyModel";
import type { ReactionItem } from "./ReactionRow";

/**
 * Everything a typed pKa-to-Keq question needs, all of it DERIVED by content/u2energy/pools.ts from the
 * course pKa table and the generated structures (nothing typed twice). Data only, no behaviour.
 */
export interface KeqTypedSpec {
  readonly id: string;
  readonly acidName: string;
  readonly baseName: string;
  readonly conjAcidName: string;
  readonly usedPka: number;
  readonly formedPka: number;
  /** pKa formed minus pKa used up: the power of ten. */
  readonly gap: number;
  /** The drawn reaction, skeletal structures. */
  readonly row: readonly ReactionItem[];
  /** The energy diagram this Keq implies, shown after the student is right. */
  readonly profile: EnergyProfile;
}
