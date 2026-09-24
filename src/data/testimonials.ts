import { cardArt, type ArtMotif } from "./testimonialArt";

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  motif: ArtMotif;
  /** Muted indigo/slate/amber wash, kept in the app's palette. */
  from: string;
  to: string;
}

/**
 * Empty until somebody real says something.
 *
 * This held six invented quotes, and the page under them carried a line
 * admitting it. Social proof that announces it is not proof is worse than no
 * social proof: it is the first thing a stranger reads on the home page, and it
 * tells them the rest of the site may also be decorated. The section renders
 * nothing while this list is empty, so putting one true quote here brings the
 * whole fan back with no other change.
 */
export const testimonials: Testimonial[] = [];

export function testimonialArt(t: Testimonial): string {
  return cardArt(t.motif, t.from, t.to);
}
