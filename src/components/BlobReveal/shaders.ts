/**
 * The blob reveal, as a WebGL2 fragment shader.
 *
 * Not CSS `mask-image` with `feTurbulence`. That cannot do either of the two
 * things this effect is actually made of: the smooth-minimum merge that fuses
 * two blobs into one shape, and the velocity response. `feDisplacementMap` over
 * a full-bleed element is also slow in Safari.
 */

/**
 * One triangle, not a quad.
 *
 * Three vertices covering the screen instead of six, and no diagonal seam down
 * the middle where two triangles meet. The positions are generated from
 * `gl_VertexID`, so there is no attribute buffer to bind at all - the vertex
 * shader is the geometry.
 */
export const VERT = `#version 300 es
out vec2 vUv;
void main() {
  // (-1,-1), (3,-1), (-1,3): a triangle whose middle covers the clip cube.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uTop;
uniform sampler2D uBottom;
uniform vec2  uResolution;
uniform vec2  uTopSize;
uniform vec2  uBottomSize;
uniform vec2  uLead;
uniform vec2  uTrail;
uniform float uRadius;
uniform float uTime;
uniform float uNoiseScale;
uniform float uWobble;
uniform float uSoftness;
uniform float uGoo;
uniform float uLens;

/* ---------------------------------------------------------------- noise --- */

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/** Value noise: hash the four lattice corners and interpolate with smoothstep. */
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/**
 * Four octaves, each half the amplitude and roughly twice the frequency.
 *
 * The 2.02 rather than 2.0 is deliberate: an exact doubling lines the lattices
 * up and leaves a faint grid in the result.
 */
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * valueNoise(p);
    p = p * 2.02;
    amp *= 0.5;
  }
  return sum;
}

/* ------------------------------------------------------------------ sdf --- */

/**
 * Polynomial smooth minimum, not min().
 *
 * A hard min() leaves a visible crease exactly where the two circles cross,
 * which is the one place the eye is already looking. This blends the two fields
 * over a band of width k so they fuse into a single poured shape.
 */
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/**
 * Distance to a point, corrected for aspect.
 *
 * Without the correction a "circle" in UV space is an ellipse on any container
 * that is not square, and the blob visibly stretches as the window widens.
 */
float sdCircle(vec2 uv, vec2 centre, float r, vec2 res) {
  vec2 d = uv - centre;
  d.x *= res.x / res.y;
  return length(d) - r;
}

/* ---------------------------------------------------------------- cover --- */

/**
 * "background-size: cover" as UV maths.
 *
 * Scales the image to fill the container on its tighter axis and centres the
 * overflow, so neither picture is stretched. Doing this in the shader rather
 * than resizing the textures keeps both images at their natural aspect.
 */
vec2 coverUv(vec2 uv, vec2 imageSize, vec2 res) {
  float containerAspect = res.x / res.y;
  float imageAspect = imageSize.x / max(imageSize.y, 1.0);
  vec2 scale = containerAspect > imageAspect
    ? vec2(1.0, imageAspect / containerAspect)
    : vec2(containerAspect / imageAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = vUv;

  // Two fields, fused. The gap between lead and trail is what stretches the
  // shape while the pointer is moving and collapses it to one bubble at rest.
  float dLead  = sdCircle(uv, uLead,  uRadius, uResolution);
  float dTrail = sdCircle(uv, uTrail, uRadius * 0.86, uResolution);
  float d = smin(dLead, dTrail, uGoo);

  // The noise origin drifts on time, which is what stops the edge reading as
  // geometry. Frozen at uTime = 0 under reduced motion.
  vec2 np = uv * uNoiseScale + vec2(uTime * 0.06, uTime * -0.045);
  d += (fbm(np) - 0.5) * uWobble;

  float mask = 1.0 - smoothstep(-uSoftness, uSoftness, d);

  /**
   * A small refraction near the boundary.
   *
   * The gradient of the mask points across the edge, so offsetting the lower
   * sample along it bends the image exactly where the rim is and nowhere else.
   * That is the difference between a bubble and a hole punched in a photograph.
   */
  float e = 1.0 / max(uResolution.y, 1.0);
  vec2 grad = vec2(
    (1.0 - smoothstep(-uSoftness, uSoftness, sdCircle(uv + vec2(e, 0.0), uLead, uRadius, uResolution))) - mask,
    (1.0 - smoothstep(-uSoftness, uSoftness, sdCircle(uv + vec2(0.0, e), uLead, uRadius, uResolution))) - mask
  );
  // Strongest at the rim (mask near 0.5), nothing in the middle or outside.
  float rim = mask * (1.0 - mask) * 4.0;
  vec2 refract = grad * rim * uLens;

  vec3 top    = texture(uTop,    coverUv(uv, uTopSize, uResolution)).rgb;
  vec3 bottom = texture(uBottom, coverUv(uv + refract, uBottomSize, uResolution)).rgb;

  outColor = vec4(mix(top, bottom, mask), 1.0);
}`;

/**
 * Every uniform, named once.
 *
 * A string-literal union rather than `string`, so the location map is a
 * `Record` TypeScript can check: a typo in a uniform name becomes a compile
 * error instead of a silently ignored `null` location at runtime, which is the
 * single most annoying way to lose an hour on a shader.
 */
export type UniformName =
  | "uTop"
  | "uBottom"
  | "uResolution"
  | "uTopSize"
  | "uBottomSize"
  | "uLead"
  | "uTrail"
  | "uRadius"
  | "uTime"
  | "uNoiseScale"
  | "uWobble"
  | "uSoftness"
  | "uGoo"
  | "uLens";

export const UNIFORM_NAMES: readonly UniformName[] = [
  "uTop",
  "uBottom",
  "uResolution",
  "uTopSize",
  "uBottomSize",
  "uLead",
  "uTrail",
  "uRadius",
  "uTime",
  "uNoiseScale",
  "uWobble",
  "uSoftness",
  "uGoo",
  "uLens",
] as const;

export type UniformMap = Record<UniformName, WebGLUniformLocation | null>;
