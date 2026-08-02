export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  color: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  { quote: "This saved my Orgo 242 grade. I walked into lab knowing more about CaCl2 than my own blood type.", name: "Anonymous Junior", role: "somehow still pre-med", color: "#818CF8", initials: "AJ" },
  { quote: "Used the Needs Review filter the morning of the LCTA and actually passed. 10/10 would deprotonate again.", name: "A Very Tired TA", role: "survived 3 semesters of this lab", color: "#34D399", initials: "TA" },
  { quote: "Read every card, aced the quiz, still can't smell diethyl ether without flashbacks to week 2.", name: "Future Dentist", role: "Grignard survivor", color: "#FBBF24", initials: "FD" },
  { quote: "Studied this between two Step 1 practice blocks. The Grignard mechanism stuck better than the Krebs cycle ever did.", name: "Future Doctor", role: "allegedly pre-med", color: "#F472B6", initials: "MD" },
  { quote: "I don't even like chemistry and I got a great score on the LCTA. Never speaking to bromobenzene again though.", name: "Future Vet", role: "still recovering", color: "#60A5FA", initials: "DVM" },
  { quote: "Printed this out, laminated it, and brought it to lab anyway. Overkill? Maybe. Effective? Absolutely.", name: "Future PA", role: "chronically overprepared", color: "#A78BFA", initials: "PA" },
];

// Generates a simple colored-initials avatar as a data URI (no external images / real photos needed).
export function avatarDataUri(initials: string, color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='300'>
    <rect width='240' height='300' fill='${color}'/>
    <text x='50%' y='53%' font-family='Arial, sans-serif' font-size='72' fill='white' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
