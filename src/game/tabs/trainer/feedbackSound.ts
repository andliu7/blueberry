/**
 * The wrong-answer sound. Owner requirement, 2026-08-25: a wrong drop plays a
 * sound immediately, paired with the failure animation, no button between the
 * mistake and the feedback.
 *
 * Synthesised, not an asset: two short descending sine blips through one gain
 * envelope. An mp3 would be a network fetch on the game route's budget and a
 * licence to track; an oscillator is 25 lines and weighs nothing. Quiet on
 * purpose (peak gain 0.08): the sound is a tap on the shoulder, not a buzzer,
 * because the voice rules in CLAUDE.md apply to audio too. No red, no klaxon.
 *
 * The notes now live in src/game/sound/sound.ts (`sfx.wrong`), so the wrong
 * sound shares one AudioContext with the correct chime and the gem pickup,
 * and the Me tab's Sound switch silences it with the rest. This file keeps
 * its name so the trainer's import does not move.
 */

import { playWrong } from "../../sound/gameSound";

/** Two falling tones, 190 ms end to end. Silent when sound is off. */
export function playWrongSound(): void {
  playWrong();
}
