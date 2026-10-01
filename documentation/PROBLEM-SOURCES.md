# Where Blueberry gets practice problems, and what actually works in learning apps

Research run 2026-09-27. Two questions, answered separately. No code was changed.

Every claim below carries a URL. Where I could not verify something I say so in the source line
and again in the last section. Nothing here is an estimate dressed up as a number.

---

## Verdict

**Question 1, problem sources.** There is no openly and commercially licensed bank of Organic
Chemistry II practice problems with explanations. Every substantial open orgo textbook I checked is
NonCommercial, including the two the product had pinned hopes on: OpenStax Organic Chemistry is
CC BY-NC-SA 4.0, and so is LibreTexts Chemistry by default. So the answer is not one source, it is a
two-part play. First, the best usable-today asset is the **mech-USPTO-31K dataset, which is CC BY 4.0
on Figshare**: 31,364 real reactions annotated with arrow-pushing as (source, sink) pairs over
atom-map numbers, one 32 MB CSV, readable by RDKit, commercially usable with attribution and no
share-alike. Paired with the **Lowe USPTO patent corpus, which is CC0**, it gives Blueberry an
effectively unlimited supply of real substrates and real electron-flow steps to build authored
problems around, which is exactly what an arrow-grading app needs and what no textbook PDF provides.
Second, the cheapest route to human-written prose explanations is **one permission email to Xin Liu
at Kwantlen Polytechnic University**, whose 2024 open textbook Organic Chemistry II is a single-author
CC BY-NC-SA work covering precisely the Orgo II spine; a single named academic is a realistic yes,
where Rice, MIT and Elsevier are not. What Blueberry must not do is what the current memory note
invites: PMechDB and RMechDB are CC BY-NC-**ND**, and using them in a paid app would be a clear
licence breach, not a grey area.

**Question 2, what works.** The strongest evidence, and the only part of this literature I would
build a product around without hedging, is **practice testing combined with distributed practice**:
Dunlosky et al. (2013) rate exactly those two as high utility out of ten techniques reviewed, and
both are backed by large meta-analyses. Interleaving is real but much more conditional than the
popular framing, and worked examples plus fading are well supported for novices specifically. The
one thing the literature does **not** support is any particular "N correct in a row" mastery rule;
that number is a product convention, not a finding, and the nearest real precedent (Corbett and
Anderson's knowledge tracing) is a probability threshold, not a streak. See the Question 2 section
for effect sizes and for where I found the evidence thin.

---

## Question 1: the licence table

### How to read this

- **Commercial use today** means: can Blueberry, a paid product, redistribute this content inside the
  app right now, with no email and no negotiation, relying only on the public licence.
- NC (NonCommercial) blocks Blueberry. Blueberry sells to students, so it is a commercial use.
- ND (NoDerivatives) blocks reformatting, re-encoding, excerpting into problem items, or any other
  adaptation, which is fatal even before the NC term bites.
- SA (ShareAlike) permits commercial use but forces derivatives out under the same licence. For
  content that is legally separable from the app's code this is survivable; where the licence reaches
  the software (see nmrshiftdb2) it is not.

### The table

| Source | Exact licence | Commercial use today? | Machine readable? | Volume and Orgo II coverage | Answers and explanations? | URL |
|---|---|---|---|---|---|---|
| **mech-USPTO-31K dataset** (Figshare) | **CC BY 4.0** (verified through the Figshare API, `license.name == "CC BY 4.0"`) | **Yes**, attribution only | **Yes.** One CSV, 32,348,446 bytes. Mechanisms encoded as a list of (Source, Sink) tuples over atom-map numbers; sources are attacking lone pairs or bonds, sinks are the receiving atom or bond. Parses with RDKit. | 31,364 reactions, from 100 mechanistic templates covering 94.8% of the USPTO-33K set. Paper names SN1/SN2, nucleophilic aromatic substitution, acyl substitution, reductive amination and pericyclics among covered classes. Polar only: organometallic and radical reactions were removed. Patent chemistry, so not curriculum-weighted. | **No.** Arrow annotations only. No prose, no distractors, no teaching. | https://figshare.com/articles/dataset/mech-USPTO-31k_reaction_dataset/24797220 (DOI 10.6084/m9.figshare.24797220.v2) |
| **Lowe USPTO patent reactions, 1976 to Sep 2016** | **CC0 1.0** (public domain dedication; verified through the Figshare API) | **Yes**, no conditions at all | **Yes.** Reaction SMILES and CML, atom-mapped with Indigo. Four archives, roughly 1.5 GB compressed. | Millions of reactions (exact count not verified by me). Patent chemistry: broad functional-group coverage, heavy on amide couplings and protections, nothing curriculum-shaped. No spectroscopy. | **No.** Reactant/product pairs and text-mined conditions. No arrows, no explanations. | https://figshare.com/articles/dataset/Chemical_reactions_from_US_patents_1976-Sep2016_/5104873 |
| **"2.85M reaction mechanisms from the USPTO reaction dataset"** (Reactron training set) | **CC BY 4.0** (verified through the Figshare API) | **Yes**, attribution only | **Yes**, CSV. | Description claims 226,669 reactions and about 2.85 million mechanistic steps, but **only `labeled_test.csv` (20.7 MB) is actually posted**; the record says "Full dataset available after the review process". Treat as a lead, not an asset. | No. | DOI 10.6084/m9.figshare.28398056.v3 |
| **Open Reaction Database (ORD)** | Data **CC BY-SA 4.0**, code Apache 2.0 | **Yes**, but share-alike propagates to derivative databases | **Yes.** Protocol-buffer schema, distributed as Parquet. | Reaction conditions, stoichiometry and yields. **No arrows.** Coverage is process chemistry, not an Orgo II syllabus. | No. | https://docs.open-reaction-database.org/en/latest/overview.html |
| **PubChem** | NCBI: "NCBI itself places no restrictions on the use or distribution of the data contained therein", **but** "some submitters of the original data ... may claim patent, copyright, or other intellectual property rights in all or a portion of the data" | Yes for structures and identifiers; per-depositor risk on anything narrative | **Yes.** REST API, SDF, SMILES, InChI. | ~120M compounds. Useful for substrates, names and properties. Not a problem source. | No. | https://www.ncbi.nlm.nih.gov/home/about/policies/ |
| **MassBank** | **CC BY 4.0** (per the 2026 Nucleic Acids Research paper) | **Yes**, attribution only | **Yes.** GitHub and Zenodo releases, plain-text records. | Search-level figure: 119,845 spectra of 18,529 compounds from 53 contributors. Mass spectrometry only, no NMR or IR. | No. | https://pmc.ncbi.nlm.nih.gov/articles/PMC12807615/ |
| **nmrshiftdb2** | Custom **ODbL-derived** "nmrshiftdb2 Database License". Section 3.1: "These rights explicitly include commercial use, and do not exclude any field of endeavour." | **Technically yes, practically no.** See the poison pill below. | **Yes.** SD file, CML, LSD, NMReDATA, SQL; bulk download. | Assigned 13-C and 1-H spectra with peak lists, peer-reviewed by a board. Real spectroscopy substrate for Orgo II structure-elucidation problems. | No explanations; assignments only. | https://nmrshiftdb.nmr.uni-koeln.de/nmrshiftdbhtml/nmrshiftdb2datalicense.txt |
| **OpenStax Organic Chemistry (McMurry, 10th ed, 2023)** | **CC BY-NC-SA 4.0.** Verbatim: "Textbook content produced by OpenStax is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike License." OpenStax help centre, verbatim: "OpenStax content is free to use and adapt, but not for commercial purposes." | **No.** NC blocks it. Permission route exists: Rice Content Reuse Request Form. | Partly. Clean HTML, MathML, downloadable PDF. No structured problem metadata, no SMILES; structures are images. | Full Orgo II coverage (carbonyls, aromatics/EAS, enolates, amines, pericyclics, acid derivatives, spectroscopy). End-of-chapter problems in every chapter. **I could not verify a total problem count.** | Yes in spirit: answers to in-chapter problems, plus separately published solutions manuals with worked steps (the NC State Pressbooks adaptation publishes a student solutions manual). | https://openstax.org/details/books/organic-chemistry ; permission form https://riceuniversity.tfaforms.net/52 |
| **LibreTexts Chemistry** | Default **CC BY-NC-SA** (3.0 or 4.0), with **per-page overrides** listed in each book's "Detailed Licensing" back matter; the option set includes CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, CC BY-ND, CC BY-NC-ND, GNU GPL and GNU FDL | **Mostly no.** Page-by-page audit would be required, and the main organic text (Morsch et al.) is the OpenStax McMurry adaptation, so NC-SA. | Partly. HTML with per-page licence metatags; structures are images. | Very large, full Orgo II coverage, plus worksheets and homework exemplars. | Varies by page. | https://chem.libretexts.org/ ; licence-tag options documented at https://chem.libretexts.org/Courses/Remixer_University/LibreTexts_Construction_Guide_1e/03%3A_Basic_Editing/3.09%3A_Selecting_Copyright_for_Page_(Meta-Tags) |
| **Organic Chemistry II, Xin Liu, KPU (2024)** | **CC BY-NC-SA 4.0.** Verbatim from the book's own metadata: "Organic Chemistry II Copyright © 2024 by Xin Liu is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License, except where otherwise noted." | **No** today. **Best permission target**: one named author, one public university. | HTML (Pressbooks), plus EPUB and editable formats. Structures are images. | Written for semester two specifically: alcohols, aldehydes and ketones, conjugated systems, aromatics, carboxylic acids and derivatives, carbohydrates, alpha-halogenation, aldol. Gaps versus our spine: amines and pericyclics are thin, spectroscopy is thin. | Yes, worked mechanisms and prose explanation are the book's stated focus. | https://kpu.pressbooks.pub/organicchemistry2/ |
| **Soderberg, Organic Chemistry with a Biological Emphasis** | **CC BY-NC-SA 4.0** (BCcampus and UMN Morris records) | **No** | HTML/PDF. | Two volumes, sophomore two-semester course, biological slant. Separate "Solutions to Selected End-of-Chapter Problems" volume exists. | Yes, a published solutions volume. | https://digitalcommons.morris.umn.edu/chem_facpubs/1/ and solutions at https://digitalcommons.morris.umn.edu/chem_facpubs/4/ |
| **Reusch, Virtual Textbook of Organic Chemistry** (now hosted by the ACS Division of Organic Chemistry) | **CC BY-NC-SA 4.0** per the live site footer: "Virtual Textbook content by Prof. William H. Reusch, Michigan State University — CC BY-NC-SA 4.0". **Conflict:** secondary records describe it as CC BY-NC-ND 3.0 US. Either way NC. | **No** | HTML with interactive problems; structures are images. | Large interactive practice-problem set across the whole two-semester sequence, plus a well-regarded spectroscopy section. | Interactive answer checking; explanation depth varies. | https://organicchemistrydata.org/reusch/virtualtext/ |
| **MIT OpenCourseWare** | **CC BY-NC-SA 4.0**, and MIT spells out the NC term: "Non-commercial use means that users may not sell, profit from, or commercialize OCW materials or works derived from them." | **No.** No commercial licensing mechanism is described. | No. PDFs and scans. | 5.12/5.13 problem sets and exams with solutions, graduate and undergraduate. | Solutions yes, explanations sometimes. | https://ocw.mit.edu/pages/privacy-and-terms-of-use/ |
| **PMechDB** (elementary polar steps, UC Irvine) | **CC BY-NC-ND.** Verbatim from the paper: "The database is governed by the Creative Commons Attribution-NonCommercial-NoDerivs (CC-BY-NC-ND) license, which restricts its free public utilization solely to noncommercial purposes." Download requires accepting terms and giving contact details. | **No. Off limits.** NC and ND both bite. | Yes: canonicalised "arrow codes" with integer atom labels, nucleophiles from 10, electrophiles from 20. | Over 100,000 elementary polar steps (about 12,799 manually curated from textbooks and literature, about 96,558 combinatorial from Mayr-Ofial nucleophile/electrophile pairs), across nine orbital-interaction classes. | No. | https://deeprxn.ics.uci.edu/pmechdb ; paper https://pmc.ncbi.nlm.nih.gov/articles/PMC10966657/ |
| **RMechDB** (elementary radical steps, UC Irvine) | **CC BY-NC-ND.** Users must accept that "the users are not allowed to modify and distribute the data set or to distribute the original data set without referencing the original source." | **No. Off limits.** | Yes: SMIRKS with atom mapping plus arrow annotations. | Over 5,300 manually curated elementary radical steps. | No. | https://deeprxn.ics.uci.edu/rmechdb ; paper https://pmc.ncbi.nlm.nih.gov/articles/PMC9976277/ |
| **NIST Chemistry WebBook** | **All rights reserved.** Live footer, verbatim: "© 2026 by the U.S. Secretary of Commerce on behalf of the United States of America. All rights reserved. Copyright for NIST Standard Reference Data is governed by the Standard Reference Data Act." NIST Standard Reference Data is exempt from the usual rule that US federal works are public domain (15 U.S.C. 290e). | **No.** Bulk spectra redistribution needs NIST permission. | Yes technically (JCAMP-DX, web forms), but the licence is the blocker, not the format. | Large IR and mass-spectrum collections; the obvious spectroscopy source, and the one everyone wrongly assumes is public domain. | No. | https://webbook.nist.gov/chemistry/ |
| **Organic Syntheses** | **All rights reserved**, Organic Syntheses Inc., 1921 to 2026. Reuse limited to 17 U.S.C. 107/108 (fair use and library copying). | **No** | No. PDF and web procedures. | Checked preparative procedures, ~100 volumes. Not problems. | Procedures, not explanations. | https://orgsyn.org/ |
| **Evans Problem Sets and Grossman PPAP** (ACS Division of Organic Chemistry site) | **All rights reserved.** No CC notice anywhere in the page footers, unlike the Reusch collection on the same site, which does carry one. Browsing Evans by problem number requires a Division member login. | **No** | No. | Real problem sets, but graduate/advanced level, not Orgo II. | Answers behind member login. | https://organicchemistrydata.org/evans/ and https://organicchemistrydata.org/grossman/ |
| **CAS SciFinder / SciFinder-n** | Subscription terms of use. Academic terms forbid automated extraction, cap retention at 5,000 records, forbid redistribution to third parties, and restrict use to non-commercial personal, educational or research use. CAS monitors download volume and can terminate. | **No.** A commercial data licence would be a separate negotiation with CAS. | API exists under commercial agreement only. | Enormous, but reaction and literature data, not problems. | No. | https://www.cas.org/legal/academic-user-terms-of-use ; academic terms PDF https://www.cas.org/sites/default/files/documents/product-use-terms-academic-10-10-23.pdf |
| **Elsevier Reaxys** | Institutional subscription. Systematic or substantial downloading is forbidden by the licence agreement. No public pricing; Academic Edition is negotiated through consortia such as Jisc. | **No** without a bespoke commercial data agreement. | API under commercial agreement only. | Enormous reaction database, not problems. | No. | https://subscriptionsmanager.jisc.ac.uk/catalogue/2886 |
| **Sigma-Aldrich / Merck web content** | All rights reserved. Merck's terms: content "cannot be distributed, modified, transmitted, reused, reposted, or used for public or commercial purposes without written permission". Sigma-Aldrich has a copyright-consent request form. | **No** | No. | Reagent data and technical notes, not problems. | No. | https://www.sigmaaldrich.com/US/en/life-science/legal/site-use-terms and https://www.sigmaaldrich.com/US/en/life-science/legal/copyright-consent |
| **ACS Examinations Institute** | All rights reserved, secure-exam programme. Instructor orders require the department chair's signature; student-facing material is sold as study guides and practice exams. | **No.** Redistribution is the precise thing the programme exists to prevent. | No. | The standardised Organic Chemistry exam and official study guide. | Study guide has explanations, sold per copy. | https://uwm.edu/acs-exams/instructors/ordering-information/ and https://acsexamsinstitute.com/ |
| **Wikibooks Organic Chemistry** | **CC BY-SA** (site footer: "Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply") | **Yes**, with share-alike on adaptations | Partly, wikitext and API. | Thin and unfinished. The book's own completion indicators show aromatics 50%, ketones and aldehydes 50%, carboxylic acids 25 to 50%, amines 75%, analytical techniques 25%; **no chapters at all on enolates or pericyclics**. | Not systematically. | https://en.wikibooks.org/wiki/Organic_Chemistry |
| **Chemistry Stack Exchange** | User contributions **CC BY-SA 4.0**. Quarterly dumps were posted to the Internet Archive, most recently April 2024; Stack Exchange's 2024 access restrictions were contested as inconsistent with the licence, which is a live dispute, not a settled point. | **Yes** in principle, with attribution to author plus a link back, and share-alike. Access route is the contested part. | **Yes.** `chemistry.stackexchange.com.7z`, 126,167,549 bytes in the Internet Archive item. | Real student questions with real explanations, but not curriculum-aligned, not evenly distributed over Orgo II, and quality is uneven. | Often yes, and the explanations are the valuable part. | https://archive.org/details/stackexchange ; dispute reported at https://devclass.com/2024/07/30/stack-exchange-restricts-access-to-dump-of-user-contributed-data-as-critics-complain-license-permits-reuse-for-any-purpose/ |
| **OpenOChem Cloud homework system** | **Claimed CC0 (public domain). I could not verify this from the rights holder.** The ASCCC OER Initiative catalogue lists "OpenOChem Cloud Homework System (LeBlond, Muzyka, Bocholtz, Greeves, 2020) (CC0 – Public Domain)". OpenOChem's own site carries no licence notice anywhere I could find, only "© OpenOChem 2025". | **Unknown. Do not act on the CC0 claim until the maintainers confirm it in writing.** If it is genuinely CC0 this is the best source in the document by a wide margin. | Yes in principle: an LTI homework system with structured, machine-checkable question types including reaction mechanisms. Export format not verified. | ASCCC catalogue says "+3,500 homework problems in the system", built for organic chemistry specifically. Coverage by Orgo II topic not verified. | Interactive grading; explanation depth not verified. | https://openochem.org/ooc/ ; catalogue entry at https://asccc-oeri.org/open-educational-resources-and-chemistry/ |
| **SDBS, Spectral Database for Organic Compounds (AIST, Japan)** | All rights reserved by AIST. Terms: "It is prohibited that you use any information of SDBS for profit-making or commercial use without obtaining proper permission", plus a request not to download more than 50 spectra per day. | **No** | No, and the 50-per-day request rules out scraping anyway. | Search-level figures: about 34,000 organic molecules, including roughly 14,700 1-H NMR and 13,000 13-C NMR spectra plus FT-IR, Raman, ESR and MS. The best-matched spectroscopy set for undergraduate structure elucidation, and legally the worst. | No. | https://sdbs.db.aist.go.jp/ ; disclaimer https://sdbs.db.aist.go.jp/sdbs/LINKS/disclaimer_eng.html |
| **RDKit** (the tool, not a source) | **BSD 3-Clause** (verified from `license.txt` in the repository) | **Yes** | n/a | n/a | n/a | https://raw.githubusercontent.com/rdkit/rdkit/master/license.txt |
| **RDKit MinimalLib / `@rdkit/rdkit`** | Same BSD 3-Clause; compiled from RDKit source to WebAssembly. Confirms the memory note that RDKit runs in the browser. | **Yes** | n/a | n/a | n/a | https://github.com/rdkit/rdkit/blob/master/Code/MinimalLib/README.md and https://www.npmjs.com/package/@rdkit/rdkit |

### The nmrshiftdb2 poison pill, quoted in full because it is easy to miss

nmrshiftdb2 permits commercial use, which makes it look like the answer for spectroscopy problems.
It is not, because the licence reaches Blueberry's own source code. Section 4.5, verbatim:

> 4.5 If you build a software which relies on the database, a derivative database or a produced work
> for its functionality, this software must be licensed under an Open Source Initiative-approved
> license. A software relies on the database, a derivative database or a produced work for its
> functionality if it cannot be used for its intended purpose without the database, a derivative
> database or a produced work for it functionality. This includes, but is not restricted to, NMR
> prediction software using the database for the prediction. The software licensed under an Open
> Source Initiative-approved license must be a functional piece of software useable by end-users for
> a purpose. A subset of your software which cannot be used for anything is not enough to satisfy
> this condition.

Source: https://nmrshiftdb.nmr.uni-koeln.de/nmrshiftdbhtml/nmrshiftdb2datalicense.txt

Whether a spectroscopy trainer inside Blueberry "cannot be used for its intended purpose without the
database" is arguable, and that argument is not one to have after shipping. Treat nmrshiftdb2 as
needing a lawyer or a separate written permission, not as a green light.

### Three buckets, plainly

**Usable commercially TODAY, no permission needed**

1. **mech-USPTO-31K**, CC BY 4.0. The single best asset found. Real arrow-pushing, RDKit-parseable,
   attribution only, no share-alike. This is the one to act on.
2. **Lowe USPTO corpus**, CC0. Unlimited real substrates and reaction pairs, zero conditions.
3. **RDKit / RDKit MinimalLib**, BSD 3-Clause. The engine that turns 1 and 2 into problems.
4. **MassBank**, CC BY 4.0, for mass spectrometry only.
5. **Open Reaction Database**, CC BY-SA 4.0, if share-alike on a derived dataset is acceptable.
6. **Wikibooks** and **Chemistry Stack Exchange**, CC BY-SA, for prose. Low quality per unit effort,
   and share-alike means any adapted text has to ship under CC BY-SA with attribution.

**Verify before anything else, because it would change the plan**

**OpenOChem.** A third-party OER catalogue run by the California Community Colleges says its 3,500+
organic chemistry homework problems are CC0. If true, that is a commercially usable, structured,
mechanism-capable problem bank purpose-built for this exact course, and it beats everything else in
this document. But the claim does not appear on OpenOChem's own site, and this is precisely the shape
of claim that has burned this product before. One email to the maintainers (LeBlond, Muzyka, Bocholtz,
Greeves) asking them to confirm the licence in writing is the highest-value action arising from this
research. Treat it as unverified until that reply exists.

**Needs an email or a licence**

1. **Xin Liu, KPU** (`Organic Chemistry II`, CC BY-NC-SA 4.0). One author, one public university,
   exactly the right scope. The highest-expected-value email in this document.
2. **Tim Soderberg, UMN Morris** (CC BY-NC-SA 4.0, and he has published a solutions volume). Same
   argument, biological slant.
3. **OpenStax / Rice**, via https://riceuniversity.tfaforms.net/52. Institutional and slow, and
   OpenStax states outright that commercial use requires permission. But the odds are better than they
   look, because there is a precedent: Aktiv Chemistry, a paid commercial courseware product,
   describes itself as "a supporting technology partner of the forthcoming new edition of Organic
   Chemistry" and advertises "specially integrated problems and exercises from the McMurry book in
   the Aktiv Chemistry content library". OpenStax's own commercial-use article points at a technology
   partner programme alongside the reuse form. So a commercial product carrying OpenStax organic
   problems demonstrably exists. What I could not verify is the terms Aktiv obtained, or whether any
   money changed hands. Source: https://aktiv.com/resources/openstax-organic-chemistry-from-john-mcmurry/
4. **NIST**, for bulk spectra. Precedent in the public record is permission for small numbers of
   spectra, not whole-collection redistribution, so plan for a capped grant.
5. **CAS or Elsevier**, for a commercial data licence. Real, expensive, and the wrong shape for a
   student app.

**Off limits, do not build on these**

1. **PMechDB and RMechDB**: CC BY-NC-ND. Both NC and ND. This is the biggest trap in the file,
   because they are the most tempting datasets in the world for an arrow-grading app, and because the
   project memory note currently flags their arrow data without flagging their licence.
2. **MIT OCW**, **Organic Syntheses**, **ACS Exams**, **Evans and Grossman problem sets**,
   **Sigma-Aldrich/Merck content**, **NIST WebBook in bulk**.
3. **LibreTexts and OpenStax text**, unless and until a written permission comes back.

### I downloaded mech-USPTO-31K and measured it, rather than trusting the paper

The 32 MB CSV was downloaded from the Figshare download URL and inspected directly, so the following
is measured, not quoted.

**Shape.** Five columns: `original_reactions`, `updated_reaction`, `mechanistic_class`,
`mechanistic_label`, `data_source`. Row count, by counting: **31,364**, matching the paper.
`original_reactions` and `updated_reaction` are atom-mapped reaction SMILES. `mechanistic_label` is an
ordered Python-literal list of `(source, sink)` pairs; integers are atom-map numbers, and a `.1`
suffix such as `201.1` denotes a lone pair on that atom rather than the atom itself. Each pair is one
curly arrow, and the list order is the mechanism's step order.

**Arrows per reaction, measured:** minimum 2, maximum 23, mean 7.2. So this is multi-arrow,
multi-step mechanism data, not single-step annotations. That is exactly the shape an arrow-grading
trainer consumes.

**Coverage, measured.** There are **63 distinct `mechanistic_class` values**. Grouped against our
Orgo II spine:

| Orgo II area | Reactions | Share |
|---|---|---|
| Carbonyl addition and acyl substitution | 15,103 | 48.2% |
| Substitution, mostly Orgo I revisited | 7,122 | 22.7% |
| Protecting groups (Boc, Cbz, Fmoc, O-demethylation) | 2,690 | 8.6% |
| Carbonyl reduction and oxidation | 2,368 | 7.6% |
| Aromatics: SNAr, Friedel-Crafts acylation, Vilsmeier | 1,837 | 5.9% |
| Heterocycle syntheses and everything else (30 classes) | 1,449 | 4.6% |
| Enolate chemistry (aldol, HWE, Wittig) | 606 | 1.9% |
| Organometallic addition (Grignard) | 189 | 0.6% |

**The gaps matter more than the totals, and they are real.** Searching all 63 class labels finds
**no** class for pericyclics, cycloaddition, Diels-Alder or electrocyclic reactions; **no** E1 or E2
elimination; and of electrophilic aromatic substitution only Friedel-Crafts acylation (121 rows) and
Vilsmeier formylation (87 rows), with no nitration, halogenation, sulfonation or Friedel-Crafts
alkylation. Enolate chemistry is 1.9% of the file, and the single largest class is DCC amide coupling
at 5,816 rows (18.5%), which is pharma process chemistry, not a syllabus.

**A conflict worth recording.** The Scientific Data paper names pericyclic reactions among the
covered reaction classes. The released CSV's 63 class labels contain no pericyclic class at all.
Either the pericyclic templates matched nothing in USPTO-33K, or they are not in this release. The
data is the authority here; do not plan a pericyclics trainer on this file.

**What that means practically.** mech-USPTO-31K is an excellent source for carbonyl and acyl
substitution arrow practice, decent for SNAr and for reduction/oxidation, thin for enolates and
aromatics, and useless for pericyclics, eliminations and EAS. Those four gaps have to be authored, or
generated from RDKit reaction templates written in-house, which is unencumbered work product.

### The trap that produced the best finding in this document

The mech-USPTO-31K **paper** in Scientific Data is licensed CC BY-NC-ND 4.0. The **dataset** it
describes is licensed CC BY 4.0. Reading only the paper gives exactly the wrong answer. The dataset
licence was confirmed by querying `https://api.figshare.com/v2/articles/24797220`, which returns
`"license": {"name": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/"}`. Paper
licence is not data licence. Check the repository record, every time.

<!-- Question 2 section follows below; written after the licence table so a partial file is still usable. -->
