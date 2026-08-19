import * as THREE from "three";

/**
 * The berry's body: an oblate spheroid with a recessed five-lobed calyx cut
 * into the top pole of the same mesh.
 *
 * Geometry and material only. Nothing here knows about moods, behaviours or
 * pose sampling.
 */

/* ---------------------------------------------------------------- geometry -- */

/**
 * Real blueberries are a little wider than tall. Softly squashed, not an egg.
 *
 * **Exported because the face has to follow it.** The body is widened on X and Z
 * in geometry space, so the front surface moves from z = 1 out to z = 1.12 and
 * the equator from x = 1 to x = 1.12. Anything placed on the surface by hand
 * against the old unit sphere ends up buried inside the fruit. Reading the same
 * constant is what stops the face and the body drifting apart again.
 */
export const OBLATE = 1.12;

/**
 * How far down from the top pole the calyx depression reaches, in radians.
 *
 * Pulled back in to 0.58 after 0.72 and 0.84 both went the wrong way. Widening
 * it made the depression broad and shallow, which stopped reading as a
 * five-pointed scar and started reading as a flat dark top. What makes a calyx
 * legible is the contrast between lobe and notch, not its diameter, so this is
 * tighter, deeper, and the lobe term now swings 0.12 to 1.00 instead of 0.35 to
 * 1.00. The crown already scales with the body, because it is cut
 * into the same mesh before the oblate scale is applied, so it was never
 * proportionally wrong. It just read too small: the berry docks at around 56px,
 * and a depression this shallow needs to cover more of the cap to be legible at
 * that size rather than disappearing into the shading.
 */
const CALYX_REACH = 0.58;

/** Depth of the depression, as a fraction of radius. Deepened with the reach. */
const CALYX_DEPTH = 0.24;

/** Depth of the small dimple at the very centre. */
const DIMPLE_DEPTH = 0.05;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Build it once.
 *
 * **Order of operations is the whole thing here, and getting it wrong is
 * silent.**
 *
 * 1. Unit sphere. The calyx maths below assumes radius 1 and a round pole, so
 *    it has to happen before any squashing or the five lobes come out elliptical
 *    on a berry that is wider than it is tall.
 * 2. Deform the pole. Displacement is along the vertex normal, which on a unit
 *    sphere is just the normalised position.
 * 3. *Then* apply oblateness, in geometry space.
 * 4. *Then* recompute normals, so they describe the squashed form rather than
 *    the round one they were built from. Recomputing before the scale would
 *    leave every normal subtly wrong, and since the bloom is normal-driven that
 *    error would show up as shading that does not match the silhouette.
 *
 * **Oblateness is baked in here and never put on `mesh.scale`.** `mesh.scale` is
 * owned by the volume-preservation system: `scaleX/Z = 1/sqrt(scaleY)` only
 * preserves volume relative to a rest state of exactly 1. Parking a resting 1.12
 * there would make every squash multiply against a non-unit rest, and the error
 * would compound across blended poses rather than cancelling.
 */
export function makeBerryBody(segments = 48): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, segments, segments);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Angle down from the top pole. On a unit sphere y is already cos(theta).
    const theta = Math.acos(Math.min(1, Math.max(-1, v.y)));
    if (theta > CALYX_REACH) continue;

    // 1 at the pole, 0 at the edge of the depression. Smoothstepped so the
    // boundary has no crease for the bloom shader to catch on.
    const falloff = 1 - smoothstep(0, CALYX_REACH, theta);

    // Five lobes. `+ 1) / 2` keeps it in 0..1 so the term only ever deepens the
    // depression rather than pushing part of it back out.
    const lobes = (Math.cos(5 * Math.atan2(v.z, v.x)) + 1) / 2;

    // The lobed ring, plus a small dimple that is strongest dead centre. The
    // ring term is zeroed at the pole itself so the two do not fight.
    const ring = falloff * (0.12 + 0.88 * lobes) * smoothstep(0, 0.18, theta);
    const dimple = DIMPLE_DEPTH * (1 - smoothstep(0, 0.2, theta));

    const inward = 1 - (CALYX_DEPTH * ring + dimple);
    // On a unit sphere the normal is the position, so scaling the position
    // *is* displacing along the normal.
    pos.setXYZ(i, v.x * inward, v.y * inward, v.z * inward);
  }

  geo.scale(OBLATE, 1, OBLATE);
  geo.computeVertexNormals();
  pos.needsUpdate = true;
  return geo;
}

/** Triangles in a geometry, for the honest count this ships with. */
export const triangleCount = (geo: THREE.BufferGeometry) =>
  geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;

/* ---------------------------------------------------------------- material -- */

/**
 * The waxy bloom, as one continuous material.
 *
 * Built by patching `MeshStandardMaterial` rather than writing a `ShaderMaterial`
 * from scratch, so the berry keeps three's real PBR lighting, shadows and
 * tone mapping. A hand-rolled shader would have to reimplement all of that to
 * sit next to the rest of the scene without looking pasted on.
 *
 * **The mix is driven by the surface normal, not by position.** Bloom is a
 * coating on the fruit: it has to stay on the upper shoulders when the berry
 * leans, and a Y-position mix would let it slide around as the body tilts. The
 * normal is in view space inside the fragment shader, so it is converted back
 * with the inverse view matrix before being compared to up.
 */
export function makeBloomMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3b2f8f,
    roughness: 0.62,
    metalness: 0.0,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDeep = { value: new THREE.Color("#3f2f9c") };
    shader.uniforms.uBloom = { value: new THREE.Color("#a9c4ff") };

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vObjPos;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       vObjPos = position;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vObjPos;
       uniform vec3 uDeep;
       uniform vec3 uBloom;

       // Cheap 3D hash. Fed object position rather than UV on purpose: UV-based
       // speckles bunch at the poles, because that is where a sphere's UV
       // islands are smallest, and the clumping is very obvious on a berry.
       float bHash(vec3 p) {
         p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
         p *= 17.0;
         return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
       }`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
       {
         // vNormal, not normal. three declares the local 'normal' inside
         // normal_fragment_begin, which runs AFTER this chunk, so naming it
         // here is a GLSL compile error: the program fails to link and the
         // mesh renders as nothing at all. vNormal is the view-space varying
         // and is already declared for us by normal_pars_fragment.
         vec3 nWorld = normalize(mat3(viewMatrix) * normalize(vNormal));

         // Wide falloff. A narrow one is exactly what produces the seam this
         // material exists to remove, so this spans nearly the whole sphere.
         // Widened again from 0.34..0.92 so the ramp is longer and gentler,
         // which also lifts the base: the underside was dark enough to eat
         // the mouth, and the mouth is drawn flat dark on top of it.
         float up = nWorld.y * 0.5 + 0.5;
         float bloom = smoothstep(0.26, 0.98, up);

         // A handful of slightly lighter points, a few percent at most. If a
         // speckle is individually identifiable at normal size it is too strong.
         float grain = bHash(floor(vObjPos * 26.0));
         float speck = smoothstep(0.93, 1.0, grain) * 0.05;

         // Subtle rim lift. Fruit, not a glass ball, so this is small and is
         // folded into the diffuse rather than added as a specular term.
         float fres = pow(1.0 - abs(dot(nWorld, vec3(0.0, 0.0, 1.0))), 3.0) * 0.06;

         vec3 skin = mix(uDeep, uBloom, bloom);
         diffuseColor.rgb = skin + speck + fres;
       }`,
    );

    // The bloom is chalky and the exposed purple is a little glossier, which is
    // how a real berry behaves where the coating has been handled off.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
       {
         vec3 nW = normalize(mat3(viewMatrix) * normalize(vNormal));
         float upR = nW.y * 0.5 + 0.5;
         roughnessFactor = mix(0.46, 0.86, smoothstep(0.26, 0.98, upR));
       }`,
    );
  };

  // Patched materials are cached by program; this keeps ours from colliding
  // with any other MeshStandardMaterial in the scene.
  mat.customProgramCacheKey = () => "berry-bloom-v1";
  return mat;
}
