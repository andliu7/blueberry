/**
 * What the charge piece hands out.
 *
 * WHY THIS EXISTS. The meter is no longer a private part of the Charge sheet:
 * the committed states sheet
 * `docs/reference/design-goals/blueberry_spec-meter-states_1788291102.png`
 * specifies ONE object with four states, and the header shows it as often as
 * the sheet does. Two drawings of one meter is how two numbers start
 * disagreeing, so there is one component and this is where a caller reaches it.
 *
 * FOR THE INTEGRATOR. The header currently draws its own charge cell and its
 * own thirty-pip coach mark (app/ui/Hud.tsx, `ChargeReading` and `ChargePips`).
 * Neither is this file's to edit. `ChargeMeter` plus `chargeMeterModel` is what
 * they should be replaced with when the header round runs:
 *
 *   const meter = chargeMeterModel(snapshot);
 *   <ChargeMeter model={meter} />
 *
 * `chargeMeterModel` takes the same EconomySnapshot the HUD model already
 * derives, so nothing new has to be plumbed and no second derivation appears.
 * Pass `{ spend }` only where a cost is actually about to be taken.
 */

export { ChargeGate, REVIEW_HREF, type ChargeGateProps } from "./ChargeGate";
export { chargeGateModel, formatClock, formatCountdown } from "./chargeGateModel";
export type {
  ChargeGateModel,
  ChargeGateNode,
  ChargeGateState,
  RefillReadout,
  TopUpReadout,
} from "./chargeGateModel";

export { ChargeMeter, type ChargeMeterProps } from "./ChargeMeter";
export { chargeMeterModel } from "./chargeMeterModel";
export type { ChargeMeterInput, ChargeMeterModel, ChargeMeterState, FlaskLiquid } from "./chargeMeterModel";
