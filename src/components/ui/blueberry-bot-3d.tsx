import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

/**
 * The blueberry bot in three dimensions: a berry head with a calyx and closed
 * eyes, a body, and a pot beneath it that leans over and swallows the head.
 *
 * Adapted from the supplied robot hero rather than taken from it. What changed:
 *
 * 1. **The head is a blueberry**, which is the whole reason it is here, so the
 *    machined sphere, the ears and the antennae are gone.
 * 2. **No `Environment` preset.** drei's presets fetch an HDR from pmndrs' CDN
 *    at runtime, which would make the hub depend on a third-party asset host to
 *    finish rendering. Three lights do the job and ship with the page.
 * 3. **No `react-icons` and no `framer-motion`.** The first duplicates lucide,
 *    already installed; the second *is* `motion` under its former name, so
 *    adding it would ship the same library twice.
 * 4. **No procedural PBR textures.** The original generates two 512px canvases
 *    with ten thousand drawn circles each, on the main thread, to give a plastic
 *    shell its grain. A berry is smooth.
 *
 * The whole module is loaded lazily. three, fiber and drei are around 600 kB,
 * and the hub is the most common landing page on the site; paying that before
 * first paint would undo the split that took the main bundle from 756 kB to
 * 545 kB. The flat bot renders instantly and this replaces it once it arrives.
 */

const BERRY_STOPS: [number, string][] = [
  [0.0, "#7dd3fc"],
  [0.28, "#4f86f7"],
  [0.66, "#6d3fe0"],
  [1.0, "#3b1d8f"],
];

/**
 * The berry's shading, baked into a texture rather than lit for.
 *
 * The mark is drawn with a radial gradient offset to the upper left, and no
 * arrangement of lights reproduces that exactly. Painting the same gradient onto
 * a canvas and wrapping the sphere in it keeps the 3-D head recognisably the
 * same object as the flat one.
 */
function useBerryTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(90, 80, 10, 128, 128, 190);
    for (const [at, colour] of BERRY_STOPS) g.addColorStop(at, colour);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** The closed, pleased eyes, as tubes so they read from any angle. */
function Eyes() {
  const curve = useMemo(() => {
    const arc = (flip: number) =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(flip * 0.34 - 0.12, -0.03, 0.93),
        new THREE.Vector3(flip * 0.34, 0.14, 1.02),
        new THREE.Vector3(flip * 0.34 + 0.12, -0.03, 0.93),
      );
    return [arc(-1), arc(1)];
  }, []);

  return (
    <>
      {curve.map((c, i) => (
        <mesh key={i}>
          <tubeGeometry args={[c, 24, 0.035, 8, false]} />
          <meshBasicMaterial color="#0b0b14" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Calyx() {
  const lobes = useMemo(() => [0, 1, 2, 3, 4].map((i) => (i * 72 * Math.PI) / 180), []);
  return (
    <group position={[0, 0.98, 0]} scale={[1, 0.62, 1]}>
      {lobes.map((rot, i) => (
        <mesh key={i} rotation={[0, rot, 0]} position={[0.22, 0, 0]}>
          <coneGeometry args={[0.11, 0.42, 5]} />
          <meshStandardMaterial color="#2c3fb0" roughness={0.6} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial color="#241f7a" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Bot({ onEat, eating }: { onEat: () => void; eating: boolean }) {
  const head = useRef<THREE.Group>(null);
  const pot = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const tex = useBerryTexture();

  useFrame(({ pointer }, delta) => {
    const dt = Math.min(delta, 0.1);
    if (head.current) {
      // Leans toward the cursor rather than looking straight at it: a full
      // look-at on a sphere with a face reads as the head spinning.
      const ty = pointer.x * 0.5;
      const tx = -pointer.y * 0.28;
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, ty, 8 * dt);
      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, tx, 8 * dt);

      // The swallow: down into the pot and shrinking as it goes.
      const targetY = eating ? -1.15 : 0;
      const targetS = eating ? 0.35 : 1;
      head.current.position.y = THREE.MathUtils.lerp(head.current.position.y, targetY, 4 * dt);
      const s = THREE.MathUtils.lerp(head.current.scale.x, targetS, 4 * dt);
      head.current.scale.setScalar(s);
    }
    if (pot.current) {
      pot.current.rotation.z = THREE.MathUtils.lerp(
        pot.current.rotation.z,
        eating ? 0.22 : 0,
        5 * dt,
      );
    }
    if (lid.current) {
      lid.current.rotation.z = THREE.MathUtils.lerp(
        lid.current.rotation.z,
        eating ? 1.1 : 0,
        6 * dt,
      );
    }
  });

  return (
    /**
     * Lifted, because the bot is not centred on its own origin: the head sits at
     * 0 and the pot hangs to about -2.4, so the shape's middle is roughly a unit
     * below where the camera was pointing and it framed low and clipped.
     */
    <group position={[0, 0.95, 0]}>
      <group
        ref={head}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onEat();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <mesh castShadow>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial map={tex} roughness={0.42} metalness={0.05} />
        </mesh>
        <Calyx />
        <Eyes />
      </group>

      {/* Pot */}
      <group ref={pot} position={[0, -1.75, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.95, 0.72, 1.15, 40]} />
          <meshStandardMaterial color="#5b21b6" roughness={0.5} />
        </mesh>
        <group ref={lid} position={[-0.95, 0.6, 0]}>
          <mesh position={[0.95, 0, 0]} castShadow>
            <cylinderGeometry args={[1.0, 1.0, 0.12, 40]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function BlueberryBot3D({ className }: { className?: string }) {
  const [eating, setEating] = useState(false);

  const eat = () => {
    if (eating) return;
    setEating(true);
    setTimeout(() => setEating(false), 2400);
  };

  return (
    // `relative` and a definite size on the wrapper, with the canvas filling it
    // absolutely. Left to size itself against a flex parent, the renderer
    // measured before the column had settled, kept a stale aspect, and drew the
    // scene shifted off to one side and clipped.
    <div className={cn("relative", className)}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 7.4], fov: 44 }}
        dpr={[1, 2]}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 1, -3]} intensity={0.35} color="#c4b5fd" />
          <Bot eating={eating} onEat={eat} />
          <ContactShadows position={[0, -1.55, 0]} opacity={0.4} scale={9} blur={2.4} far={4} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default BlueberryBot3D;
