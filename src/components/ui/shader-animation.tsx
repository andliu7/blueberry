import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The animated shader background.
 *
 * The fragment shader is the supplied one, unchanged. What is different is that
 * it runs on raw WebGL rather than three.js. All three.js was doing here was
 * putting a 2x2 plane in front of an orthographic camera so the fragment shader
 * could paint every pixel, which is a fullscreen quad and about thirty lines
 * without it. Adding three would have put roughly 155 kB gzipped onto a 211 kB
 * bundle for a decorative background, on a site people open on a phone.
 *
 * Two things the original did not do:
 *
 * - **Fails soft.** If WebGL is unavailable, or the context is lost, this shows
 *   a CSS gradient instead of an empty black rectangle.
 * - **Respects reduced motion.** It renders a single frame and stops, so the
 *   colours are still there without anything moving.
 */

const VERT = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `
#define TWO_PI 6.2831853072
#define PI 3.14159265359

precision highp float;
uniform vec2 resolution;
uniform float time;

void main(void) {
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
  float t = time * 0.05;
  float lineWidth = 0.002;

  vec3 color = vec3(0.0);
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 5; i++) {
      color[j] += lineWidth * float(i * i) /
        abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0 - length(uv) + mod(uv.x + uv.y, 0.2));
    }
  }

  gl_FragColor = vec4(color[0], color[1], color[2], 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderAnimation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }

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
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    // Two triangles covering clip space. This is the whole of what the three.js
    // scene, camera and PlaneGeometry were for.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "time");
    const uRes = gl.getUniformLocation(program, "resolution");

    // Capped at 2: this shader is per-pixel and a 3x retina phone would be
    // shading nine times the work for no visible gain.
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr()));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr()));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let time = 1;
    let raf = 0;

    const frame = () => {
      resize();
      time += 0.05;
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduced) raf = requestAnimationFrame(frame);
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    window.addEventListener("resize", resize);
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // Deliberately not calling WEBGL_lose_context here. React StrictMode
      // mounts, unmounts and remounts in development, and the second mount gets
      // the same canvas back. Destroying the context on the first cleanup left
      // the remount compiling against a dead context, which fails with a null
      // info log and silently dropped the whole shader to its fallback.
      // Dropping the canvas is enough; the browser reclaims the context.
    };
  }, []);

  if (failed) {
    return (
      <div
        aria-hidden
        className={cn("h-full w-full", className)}
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, #1e1b4b 0%, #0b1026 45%, #000 100%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("block h-full w-full", className)}
      style={{ background: "#000" }}
    />
  );
}

export default ShaderAnimation;
