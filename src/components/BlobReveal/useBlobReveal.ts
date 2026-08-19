import { useEffect, useRef, useState } from "react";
import { FRAG, UNIFORM_NAMES, VERT, type UniformMap } from "./shaders";

/**
 * The WebGL2 half of BlobReveal: context, textures, observers, the loop.
 *
 * Split out so the component stays a readable list of props and fallbacks. All
 * the mutable per-frame state lives in refs rather than React state, because
 * every one of these changes sixty times a second and none of them should cause
 * a render.
 */

export interface BlobRevealTuning {
  baseRadius: number;
  speedGain: number;
  noiseScale: number;
  wobble: number;
  softness: number;
  goo: number;
  trailLag: number;
  lens: number;
}

/** How fast the lead follower chases the raw pointer. */
const LEAD_LERP = 0.16;

/** Uncapped DPR on a 4K display costs fill rate for no visible gain. */
const MAX_DPR = 2;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("BlobReveal shader failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * A decoded image as a texture.
 *
 * `CLAMP_TO_EDGE` because the cover mapping can sample just outside 0..1 at the
 * rim, and the default `REPEAT` would wrap the opposite edge of the photograph
 * into that sliver. `LINEAR` with no mipmaps: the image is drawn at roughly its
 * own size and mipmapping a non-power-of-two texture is a separate argument.
 */
function makeTexture(gl: WebGL2RenderingContext, image: HTMLImageElement): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/** Both images, decoded before anything is drawn, so there is no untextured flash. */
function loadImages(topSrc: string, bottomSrc: string): Promise<[HTMLImageElement, HTMLImageElement]> {
  const one = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // `decode` rather than trusting onload: onload fires before the bitmap
        // is ready on some browsers, and uploading then gives a blank texture.
        if (img.decode) img.decode().then(() => resolve(img)).catch(() => resolve(img));
        else resolve(img);
      };
      img.onerror = () => reject(new Error(`could not load ${src}`));
      img.src = src;
    });
  return Promise.all([one(topSrc), one(bottomSrc)]);
}

export function useBlobReveal(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  topSrc: string,
  bottomSrc: string,
  tuning: BlobRevealTuning,
  /** False on touch and when WebGL2 is missing: nothing mounts, nothing loops. */
  enabled: boolean,
) {
  const [failed, setFailed] = useState(false);

  // Tuning changes should not tear the context down and rebuild it, so the loop
  // reads the latest values through a ref rather than closing over them.
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }

    let raf = 0;
    let disposed = false;
    let visible = true;
    let running = false;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      setFailed(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("BlobReveal link failed:", gl.getProgramInfoLog(program));
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    // A VAO with no attributes. The triangle comes from gl_VertexID, but WebGL2
    // still wants a bound vertex array object to draw at all.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const u = Object.fromEntries(
      UNIFORM_NAMES.map((name) => [name, gl.getUniformLocation(program, name)]),
    ) as UniformMap;

    let topTex: WebGLTexture | null = null;
    let bottomTex: WebGLTexture | null = null;

    /* --------------------------------------------------------- pointer --- */

    // Start in the middle so the first frame is a bubble in the centre rather
    // than one stuck in the top-left corner waiting to be found.
    const raw = { x: 0.5, y: 0.5 };
    const lead = { x: 0.5, y: 0.5 };
    const trail = { x: 0.5, y: 0.5 };
    let speed = 0;

    const onPointer = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      raw.x = (e.clientX - r.left) / r.width;
      // Flipped: WebGL's origin is bottom-left, the DOM's is top-left.
      raw.y = 1 - (e.clientY - r.top) / r.height;
    };
    container.addEventListener("pointermove", onPointer, { passive: true });

    /* ------------------------------------------------------------ size --- */

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(container.clientWidth * dpr));
      const h = Math.max(1, Math.round(container.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };

    // ResizeObserver, not a window resize listener: the container can change
    // size on its own, and a window listener misses every one of those.
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    /* ------------------------------------------------------------ loop --- */

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const start = performance.now();

    const frame = () => {
      if (disposed) return;
      const t = tuningRef.current;

      lead.x += (raw.x - lead.x) * LEAD_LERP;
      lead.y += (raw.y - lead.y) * LEAD_LERP;
      const prevX = trail.x;
      const prevY = trail.y;
      trail.x += (lead.x - trail.x) * t.trailLag;
      trail.y += (lead.y - trail.y) * t.trailLag;

      // Smoothed, so one fast frame does not pop the blob open and shut.
      const step = Math.hypot(trail.x - prevX, trail.y - prevY);
      speed += (step - speed) * 0.12;

      // Reduced motion keeps the pointer following and drops the growth.
      const grow = reduced ? 0 : Math.min(speed * t.speedGain * 14, t.baseRadius * 1.6);

      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform2f(u.uLead, lead.x, lead.y);
      gl.uniform2f(u.uTrail, trail.x, trail.y);
      gl.uniform1f(u.uRadius, t.baseRadius + grow);
      gl.uniform1f(u.uTime, reduced ? 0 : (performance.now() - start) / 1000);
      gl.uniform1f(u.uNoiseScale, t.noiseScale);
      gl.uniform1f(u.uWobble, t.wobble);
      gl.uniform1f(u.uSoftness, t.softness);
      gl.uniform1f(u.uGoo, t.goo);
      gl.uniform1f(u.uLens, t.lens);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };

    const play = () => {
      if (running || disposed || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // A landing decoration should not burn battery while scrolled past.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play();
        else pause();
      },
      { threshold: 0 },
    );
    io.observe(container);

    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);

    const onLost = (e: Event) => {
      e.preventDefault();
      pause();
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    /* ---------------------------------------------------------- start --- */

    void loadImages(topSrc, bottomSrc)
      .then(([top, bottom]) => {
        if (disposed) return;
        topTex = makeTexture(gl, top);
        bottomTex = makeTexture(gl, bottom);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, topTex);
        gl.uniform1i(u.uTop, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, bottomTex);
        gl.uniform1i(u.uBottom, 1);

        gl.uniform2f(u.uTopSize, top.naturalWidth, top.naturalHeight);
        gl.uniform2f(u.uBottomSize, bottom.naturalWidth, bottom.naturalHeight);

        resize();
        play();
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      container.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      ro.disconnect();
      io.disconnect();
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (topTex) gl.deleteTexture(topTex);
      if (bottomTex) gl.deleteTexture(bottomTex);
      // Deliberately not WEBGL_lose_context. React StrictMode mounts, unmounts
      // and remounts, and the second mount gets the same canvas back; killing
      // the context on the first cleanup leaves the remount compiling against a
      // dead one, which fails with a null info log and silently drops to the
      // fallback. `shader-animation.tsx` carries the same note.
    };
  }, [canvasRef, containerRef, topSrc, bottomSrc, enabled]);

  return { failed };
}
