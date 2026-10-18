/**
 * The charge sheet's words when it opens from the resume screen's START OVER.
 *
 * START OVER is the one destructive choice in save-as-you-go: committing it
 * erases the bookmark. The plain entry sheet reads like any fresh start
 * ("5 charge to start"), so a student could press START without knowing the
 * saved questions go with it. Here the headline names what is lost, the line
 * keeps the price, and the keys say what each one does to the save.
 *
 * The empty state is left alone: there the primary key goes to review drills
 * and nothing is erased, so there is no loss to name.
 */

import type { ChargeGateModel } from "../charge/chargeGateModel";

/** `questions` names what is saved, for example "4 saved questions" or "1 saved problem". */
export function restartCopy(model: ChargeGateModel, questions: string): ChargeGateModel {
  if (model.state === "empty" || questions === "") return model;
  const price = model.cost > 0 ? `A fresh run costs ${model.cost} charge. ` : "";
  return {
    ...model,
    headline: `Start over and erase ${questions}?`,
    line: `${price}Your place in this lesson is wiped, and it can't be undone.`,
    primaryLabel: "Erase and start over",
    dismissLabel: "Keep my progress",
    label: `Start over and erase ${questions}`,
    // "Wrong answers cost nothing" is true, but on this sheet it is noise beside the one thing at stake.
    promise: "",
  };
}

/**
 * Whether the sheet is the START OVER sheet, so ChargeGate flips its keys:
 * KEEP MY PROGRESS becomes the big filled key where START sits on every other
 * sheet, and the erase drops to plain red text under it. A thumb that lands
 * on the default key keeps the save; erasing has to be meant.
 */
export function isRestart(model: ChargeGateModel, questions: string | undefined): boolean {
  return questions !== undefined && questions !== "" && model.state !== "empty";
}

/**
 * The leave sheet's line on rewards. The economy pays a lesson's XP and
 * diamonds when it is cleared (packages/economy derive.ts, node_cleared),
 * and today's streak counts that XP, so a student leaving part way has
 * banked their place but not those yet. The sheet says so plainly rather
 * than letting "your progress is saved" imply the rewards are in too. A
 * replay pays no diamonds (firstClears), so the line does not promise them.
 */
export function leaveRewardLine(clearedBefore: boolean): string {
  return clearedBefore
    ? "Your XP and streak credit land when you finish it."
    : "Your XP, diamonds and streak credit land when you finish it.";
}
