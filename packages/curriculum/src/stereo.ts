/**
 * Precomputed stereochemical labels, authored onto a problem, never derived on
 * device.
 *
 * WHY THIS FILE EXISTS AT ALL. CLAUDE.md's CIP section is unambiguous: chem-core
 * does not implement CIP, correct CIP needs the hierarchical digraph with
 * duplicate atoms and ring handling and shipped implementations have carried bugs
 * in it for years, RDKit assigns descriptors in validators, and "labels needed at
 * runtime are precomputed at authoring time and stored on the problem, never
 * derived on device". This is the field that sentence describes. Without it the
 * rule has nowhere to land and the first Re and Si problem quietly forces a CIP
 * implementation onto the client.
 *
 * WHY IT IS NOT JUST A DESCRIPTOR PER STEREOCENTRE.
 * `docs/COURSE-OUTLINE-ORGO2.md` section 3, `prochirality_re_si`, records that
 * the source course drills four directions on this one skill, and the fourth is
 * the reverse: the student draws a product and the engine must report which face
 * that implies. A table keyed only by face answers the first three and cannot
 * answer the fourth. So a face label may carry `givesConfiguration`, which is the
 * configuration produced by attack on that face, and the reverse question is then
 * a lookup on that field instead of a CIP computation. Prochirality is 6 points
 * on Act 2's exam in every semester examined, so the direction that needs this is
 * not an edge case.
 *
 * WHAT THIS IS NOT. It is not a stereochemistry comparison and it does not make
 * one possible. answers/structure.ts compares constitution only and refuses a
 * structure answer carrying a stereo declaration, and that refusal stands. These
 * labels are authored metadata a prompt and a diagnostic can read. The comparison
 * closes when canonical comparison through Indigo is wired on the lazy editor
 * route, and it closes there, not here.
 */

/** A configuration at a tetrahedral centre. */
export type StereoDescriptor = "R" | "S";

/** A face of a trigonal, prochiral centre. */
export type ProchiralFace = "Re" | "Si";

/**
 * Anything a label can say about a site that is not a prochiral face.
 *
 * Deliberately a small closed set. Every member is a descriptor the source course
 * assesses: R and S, E and Z on a double bond, cis and trans on a ring or an
 * addition outcome, and meso, which CLAUDE.md names directly in the bromine
 * addition fixture.
 */
export type SiteDescriptor = StereoDescriptor | "E" | "Z" | "cis" | "trans" | "meso";

/**
 * Where the label came from.
 *
 * `rdkit_precomputed` means RDKit produced it in a validator and it was copied
 * here, which is the path CLAUDE.md prescribes. `authored` means a person wrote
 * it. Both are legal and the difference is worth keeping, because a later check
 * can require the RDKit path for exactly the descriptors RDKit is the oracle for.
 */
export type StereoLabelSource = "rdkit_precomputed" | "authored";

export interface StereocentreLabel {
  /**
   * The site this label is about, in the problem's own terms.
   *
   * Free text, because it names a position in one prompt's drawing and is never
   * counted across problems. "C2", "the carbinol carbon", "the ring fusion".
   */
  readonly site: string;
  readonly descriptor: SiteDescriptor;
}

export interface ProchiralFaceLabel {
  readonly site: string;
  readonly face: ProchiralFace;
  /**
   * The configuration produced by attack on this face, when the problem needs the
   * reverse direction. Optional, because three of the four drilled directions do
   * not need it.
   */
  readonly givesConfiguration?: StereoDescriptor;
}

export interface StereoLabels {
  readonly centres?: readonly StereocentreLabel[];
  readonly faces?: readonly ProchiralFaceLabel[];
  readonly source: StereoLabelSource;
}

/**
 * Everything a stereo label block can be internally wrong about.
 *
 * The interesting one is the last: if both faces of one site declare the
 * configuration they produce, and both produce the same one, the labels are
 * wrong, because attack on the two faces of a prochiral centre gives opposite
 * configurations. That is the single check that catches the mistake this whole
 * field exists to prevent, and it costs one comparison.
 */
export function assertStereoLabelsValid(problemId: string, labels: StereoLabels): void {
  const centres = labels.centres ?? [];
  const faces = labels.faces ?? [];
  if (centres.length === 0 && faces.length === 0) {
    throw new Error(
      `problem ${problemId} carries a stereo label block with no centres and no faces in it, ` +
        `which reads as a stereochemistry requirement nobody wrote down`,
    );
  }

  const centreSites = new Set<string>();
  for (const centre of centres) {
    if (centre.site.trim() === "") {
      throw new Error(`problem ${problemId} has a stereocentre label with no site named`);
    }
    if (centreSites.has(centre.site)) {
      throw new Error(
        `problem ${problemId} labels site ${centre.site} twice, so which descriptor a renderer ` +
          `shows depends on authoring order`,
      );
    }
    centreSites.add(centre.site);
  }

  const seenFaces = new Set<string>();
  for (const face of faces) {
    if (face.site.trim() === "") {
      throw new Error(`problem ${problemId} has a prochiral face label with no site named`);
    }
    const key = `${face.site}/${face.face}`;
    if (seenFaces.has(key)) {
      throw new Error(`problem ${problemId} labels the ${face.face} face of ${face.site} twice`);
    }
    seenFaces.add(key);
  }

  for (const site of new Set(faces.map((face) => face.site))) {
    const declared = faces
      .filter((face) => face.site === site)
      .map((face) => face.givesConfiguration)
      .filter((configuration): configuration is StereoDescriptor => configuration !== undefined);
    if (declared.length === 2 && declared[0] === declared[1]) {
      throw new Error(
        `problem ${problemId} says both faces of ${site} give the ${String(declared[0])} product. ` +
          `Attack on the two faces of a prochiral centre gives opposite configurations, so one of ` +
          `these labels is wrong and a student would be marked against it.`,
      );
    }
  }
}
