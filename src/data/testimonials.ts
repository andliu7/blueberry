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

export const testimonials: Testimonial[] = [
  {
    quote: "This saved my Orgo 242 grade. I walked into lab knowing more about CaCl2 than my own blood type.",
    name: "Anonymous Junior",
    role: "somehow still pre-med",
    initials: "AJ",
    motif: "erlenmeyer",
    from: "#4f46e5",
    to: "#6366f1",
  },
  {
    quote: "Used the Needs Review filter the morning of the LCTA and actually passed. 10/10 would deprotonate again.",
    name: "A Very Tired TA",
    role: "survived 3 semesters of this lab",
    initials: "TA",
    motif: "benzene",
    from: "#334155",
    to: "#52627a",
  },
  {
    quote: "Read every card, aced the quiz, still can't smell diethyl ether without flashbacks to week 2.",
    name: "Future Dentist",
    role: "Grignard survivor",
    initials: "FD",
    motif: "reflux",
    from: "#4338ca",
    to: "#6d28d9",
  },
  {
    quote: "Studied this between two Step 1 practice blocks. The Grignard mechanism stuck better than the Krebs cycle ever did.",
    name: "Future Doctor",
    role: "allegedly pre-med",
    initials: "MD",
    motif: "nmr",
    from: "#0f766e",
    to: "#155e75",
  },
  {
    quote: "I don't even like chemistry and I got a great score on the LCTA. Never speaking to bromobenzene again though.",
    name: "Future Vet",
    role: "still recovering",
    initials: "DVM",
    motif: "sepfunnel",
    from: "#92400e",
    to: "#b45309",
  },
  {
    quote: "Printed this out, laminated it, and brought it to lab anyway. Overkill? Maybe. Effective? Absolutely.",
    name: "Future PA",
    role: "chronically overprepared",
    initials: "PA",
    motif: "ir",
    from: "#1e3a8a",
    to: "#1d4ed8",
  },
];

export function testimonialArt(t: Testimonial): string {
  return cardArt(t.motif, t.from, t.to);
}
