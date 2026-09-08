/**
 * The 3D renderer: the same MechanismRenderProps as the SVG renderer, drawn
 * with three through @react-three/fiber (R3F: a React renderer that emits
 * three.js scene objects instead of DOM nodes, so a mesh is written like a
 * component).
 *
 * This file is the ONLY place three is imported, and it is reached exclusively
 * through React.lazy in the demo, so the multi-megabyte dependency stays out
 * of the initial chunk. The budget gate verifies that claim on every validate
 * run; this comment is not the enforcement, the gate is.
 *
 * Why 3D exists at all, per BUILD-PROMPT Phase 4: only for questions 2D cannot
 * answer. The demo question is SN2 backside geometry: in 2D the 180 degree
 * approach is an assertion, in 3D it is visible from any angle the student
 * drags to. Everything else in the product defaults to the SVG renderer.
 *
 * Deliberately minimal: atoms as spheres, bonds as cylinders, charges as
 * floating text sprites. No arrows here in Phase 4; arrow ribbons in 3D are
 * real work and no current question needs them. The interface holding across
 * both renderers is the deliverable, not feature parity.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { MechanismRenderProps } from "../contract";
import { REDUCED_MOTION_FRAME } from "../contract";
import type { SceneBond } from "../layout/stepScene";
import type { Vec } from "../layout/vec";
import { clamp01, lerp, smoothstep } from "../layout/vec";

const ELEMENT_COLOR: Record<string, string> = {
  C: "#334155",
  H: "#94a3b8",
  O: "#dc2626",
  N: "#2563eb",
  Br: "#9a3412",
  Cl: "#15803d",
  S: "#a16207",
  F: "#0e7490",
};

function colorFor(element: string): string {
  return ELEMENT_COLOR[element] ?? "#334155";
}

function toThree(v: Vec): [number, number, number] {
  return [v.x, v.y, v.z];
}

function Bond({ from, to, phase, t }: { from: Vec; to: Vec; phase: SceneBond["phase"]; t: number }) {
  let opacity = 1;
  let end = to;
  if (phase === "breaking") opacity = 1 - smoothstep(0.35, 0.85, t);
  if (phase === "forming") {
    const grow = smoothstep(0.3, 0.85, t);
    opacity = Math.min(1, grow * 1.6);
    end = lerp(from, to, grow);
  }
  if (opacity <= 0.01) return null;

  const a = new THREE.Vector3(...toThree(from));
  const b = new THREE.Vector3(...toThree(end));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-6) return null;
  // A cylinder's own axis is y; rotate y onto the bond direction.
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.05, 0.05, len, 12]} />
      <meshStandardMaterial color="#64748b" transparent opacity={opacity} />
    </mesh>
  );
}

/**
 * The camera: a slow idle orbit until the student takes hold, then their
 * drag owns it. Owner request, 2026-08-26: "a mode where I can drag the
 * screen and look around it, so I can see the actual stereochemistry and the
 * hybridization." Dragging sets azimuth and elevation directly; releasing
 * leaves the view where the hand put it, and the idle drift resumes only
 * from that pose, so the model never snaps away from what the student chose
 * to look at.
 */
function OrbitCamera({ enabled, pose }: { enabled: boolean; pose: { azimuth: number; elevation: number; dragging: boolean } }) {
  const { camera } = useThree();
  useFrame((_, delta) => {
    if (enabled && !pose.dragging) pose.azimuth += delta * 0.25;
    const r = 4.4;
    const el = Math.max(-1.2, Math.min(1.2, pose.elevation));
    camera.position.set(Math.sin(pose.azimuth) * Math.cos(el) * r, Math.sin(el) * r + 0.6, Math.cos(pose.azimuth) * Math.cos(el) * r);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function Scene3D({ scene, progress, reducedMotion }: MechanismRenderProps) {
  const t = reducedMotion ? REDUCED_MOTION_FRAME : clamp01(progress);
  const glide = smoothstep(0.25, 0.85, t);

  const positions = new Map<string, Vec>();
  for (const atom of scene.atoms) {
    positions.set(atom.id, lerp(atom.from.pos, atom.to.pos, glide));
  }
  const at = (id: string): Vec => positions.get(id) ?? { x: 0, y: 0, z: 0 };

  // The pose lives in a ref-like mutable object: useFrame mutates it every
  // frame and pointer handlers mutate it mid-drag, and neither should force a
  // React render.
  const poseRef = useRef({ azimuth: 0, elevation: 0.3, dragging: false });
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  return (
    <Canvas
      camera={{ position: [0, 1.4, 4.4], fov: 45 }}
      dpr={[1, 2]}
      style={{ touchAction: "none", cursor: "grab" }}
      onPointerDown={(event) => {
        poseRef.current.dragging = true;
        lastPointer.current = { x: event.clientX, y: event.clientY };
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        const last = lastPointer.current;
        if (!poseRef.current.dragging || last === null) return;
        poseRef.current.azimuth -= (event.clientX - last.x) * 0.008;
        poseRef.current.elevation += (event.clientY - last.y) * 0.006;
        lastPointer.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={() => {
        poseRef.current.dragging = false;
        lastPointer.current = null;
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <OrbitCamera enabled={!reducedMotion} pose={poseRef.current} />
      {scene.bonds.map((bond) => (
        <Bond key={bond.key} from={at(bond.a)} to={at(bond.b)} phase={bond.phase} t={t} />
      ))}
      {scene.atoms.map((atom) => {
        const charge = glide > 0.5 ? atom.toCharge : atom.fromCharge;
        return (
          <group key={atom.id} position={toThree(at(atom.id))}>
            <mesh>
              <sphereGeometry args={[atom.element === "H" ? 0.16 : 0.28, 24, 24]} />
              <meshStandardMaterial color={colorFor(atom.element)} />
            </mesh>
            {charge !== 0 ? (
              <mesh position={[0.32, 0.32, 0]}>
                <sphereGeometry args={[0.07, 12, 12]} />
                <meshStandardMaterial
                  color={charge > 0 ? "#3f4286" : "#a4123c"}
                  emissive={charge > 0 ? "#3f4286" : "#a4123c"}
                  emissiveIntensity={0.6}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </Canvas>
  );
}

export default Scene3D;
