/**
 * THE SPOKEN ANSWER SEAM. Nothing here recognises speech, and that is the whole
 * point of the file.
 *
 * The owner asked for a spoken answer at L3 later, and the expensive half of
 * adding one later is not the recogniser: it is that the surface has no place
 * to put an answer that did not come from the keyboard. So the place exists
 * now. `SpeechSeam` is what a recogniser would have to provide, the component
 * takes it as an optional prop, and when nothing supplies one the surface
 * renders exactly what it renders today and costs nothing at import time.
 *
 * WHY THE SEAM IS SHAPED THIS WAY. A recogniser produces a STRING, and the L3
 * path already grades a string: parse.ts turns typed text into reagent tokens,
 * and it does not care whether a finger or a microphone produced it. So the
 * seam hands back text and stops. Anything cleverer, such as a recogniser that
 * tried to return reagent tokens directly, would be a second parser nobody
 * reviewed sitting beside the one that is tested.
 *
 * WHAT AN IMPLEMENTATION WILL HAVE TO DECIDE, written down while it is cheap:
 * chemistry names are not in any general speech model's vocabulary, so a real
 * implementation needs the problem's own answer vocabulary as a hint list, and
 * `answerVocabulary` in parse.ts already computes exactly that. Permission
 * prompts, a visible recording state and a way to cancel are the surface's
 * problem, not this interface's.
 */

export interface SpeechListenHandle {
  /** Stop listening. Safe to call twice. */
  stop(): void;
}

export interface SpeechSeam {
  /** False when the device or the browser cannot do it. The button hides. */
  readonly available: boolean;
  /** The label on the control, so a provider can say what it actually offers. */
  readonly label: string;
  /**
   * Start listening. `onText` may fire more than once as a phrase settles, and
   * the last call before `stop` is the answer.
   */
  listen(onText: (text: string) => void): SpeechListenHandle;
}
