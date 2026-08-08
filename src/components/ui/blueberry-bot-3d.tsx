import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

/**
 * The blueberry, in three dimensions, watching the cursor.
 *
 * A berry with its calyx, the kind eyes, and a mouth that drops open as it
 * follows you. There is no pot and nothing gets swallowed: that was a lot of
 * geometry and timing in service of a gag you see once, and what people
 * actually do with this is move the mouse and watch it look back.
 *
 * Adapted from the supplied robot hero rather than taken from it:
 *
 * 1. **The head is a blueberry**, which is the whole point, so the machined
 *    sphere, the ears and the antennae are gone.
 * 2. **No `Environment` preset.** drei's presets fetch an HDR from pmndrs' CDN
 *    at runtime, which would make the hub depend on a third-party asset host to
 *    finish rendering. Three lights ship with the page and do the job.
 * 3. **No `react-icons`, no `framer-motion`.** The first duplicates lucide; the
 *    second *is* `motion` under its former name, so it would ship the same
 *    library twice.
 * 4. **No procedural PBR textures.** The original draws ten thousand circles
 *    onto two 512px canvases on the main thread to give a plastic shell grain.
 *    A berry is smooth.
 *
 * Loaded lazily. three, fiber and drei are around 600 kB and the hub is the most
 * common landing page; paying that before first paint would undo the split that
 * took the main bundle from 756 kB to 545 kB.
 */

const BERRY_STOPS: [number, string][] = [
  [0.0, "#7dd3fc"],
  [0.28, "#4f86f7"],
  [0.66, "#6d3fe0"],
  [1.0, "#3b1d8f"],
];

/**
 * The berry's shading, painted into a texture rather than lit for.
 *
 * The mark is a radial gradient offset to the upper left, and no arrangement of
 * lights reproduces that exactly. Wrapping the sphere in the same gradient keeps
 * the 3-D head recognisably the same object as the flat one.
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

/**
 * One eye, in three states: open, blinked shut, and flustered.
 *
 * The flustered pair is the same curve as the blink, turned a quarter turn so
 * its apex points inward: a curved `>` on the left and `<` on the right. Rotating
 * one geometry rather than drawing a second keeps the two expressions
 * recognisably the same eye, which is the whole reason they read as one
 * character doing different things rather than three different faces.
 *
 * States are separate meshes toggled by visibility rather than one mesh being
 * squashed. A scaled sphere flattening to nothing passes through shapes that
 * are neither an eye nor a lid, and at this size that reads as a glitch.
 */
type EyeMode = "open" | "shut" | "fluster";

function Eye({ side, modeRef }: { side: number; modeRef: React.RefObject<EyeMode> }) {
  const open = useRef<THREE.Group>(null);
  const shut = useRef<THREE.Group>(null);
  const cross = useRef<THREE.Group>(null);

  const arc = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.15, 0.0, 0.0),
        new THREE.Vector3(0, 0.2, 0.05),
        new THREE.Vector3(0.15, 0.0, 0.0),
      ),
    [],
  );

  useFrame(() => {
    const m = modeRef.current;
    if (open.current) open.current.visible = m === "open";
    if (shut.current) shut.current.visible = m === "shut";
    if (cross.current) cross.current.visible = m === "fluster";
  });

  return (
    <group position={[side * 0.38, 0.12, 0.9]}>
      <group ref={open}>
        <mesh scale={[0.13, 0.2, 0.08]}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshBasicMaterial color="#0b0b14" toneMapped={false} />
        </mesh>
        {/* The shine, high on the left, matching the flat mark. */}
        <mesh position={[-0.045, 0.075, 0.06]} scale={[0.04, 0.055, 0.03]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>

      <group ref={shut} visible={false}>
        <mesh>
          <tubeGeometry args={[arc, 20, 0.035, 8, false]} />
          <meshBasicMaterial color="#0b0b14" toneMapped={false} />
        </mesh>
      </group>

      {/* A quarter turn inward, so the apex faces the middle of the face. */}
      <group ref={cross} visible={false} rotation={[0, 0, side * Math.PI * 0.5]}>
        <mesh>
          <tubeGeometry args={[arc, 20, 0.035, 8, false]} />
          <meshBasicMaterial color="#0b0b14" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Calyx() {
  const lobes = useMemo(() => [0, 1, 2, 3, 4].map((i) => (i * 72 * Math.PI) / 180), []);
  return (
    // Higher and much less squashed than it was. Laid almost flat at 0.55 it
    // vanished the moment the head tipped back to look up, which is exactly when
    // you are looking at the top of him.
    <group position={[0, 1.02, 0]} scale={[1, 0.92, 1]}>
      {lobes.map((rot, i) => (
        // Laid outward at roughly sixty degrees and lengthened. Standing more
        // upright they read as spikes out of the crown of the head rather than
        // as a calyx lying on it.
        <mesh key={i} rotation={[0, rot, 0.82]} position={[0.3, 0.08, 0]}>
          <coneGeometry args={[0.16, 0.72, 5]} />
          <meshStandardMaterial color="#2c3fb0" roughness={0.55} flatShading />
        </mesh>
      ))}
      <mesh scale={[1, 1.3, 1]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#241f7a" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Seconds per blink cycle, and how much of it the eyes are shut. */
const BLINK_CYCLE = 5.4;
const BLINK_SHUT = 0.22;

function Berry() {
  const head = useRef<THREE.Group>(null);
  // A ref rather than state: this changes on a clock and nothing about the
  // React tree depends on it, so re-rendering for it would be waste.
  // Refs rather than state: these change on a clock and on a pointer, and
  // nothing about the React tree depends on them, so re-rendering would be waste.
  const eyeMode = useRef<EyeMode>("open");
  const hovered = useRef(false);
  /**
   * How much of the hover shake is running, 0 to 1.
   *
   * An amplitude that eases in and out, rather than switching the shake on and
   * off. Driving the angle straight from `hovered` starts and stops mid-swing,
   * which reads as a glitch; ramping the amplitude means it always begins and
   * ends at rest however briefly the cursor passes over.
   */
  const shake = useRef(0);
  const blush = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const smile = useRef<THREE.Mesh>(null);
  const tex = useBerryTexture();

  /** The resting smile: shallow and wide, matching the flat mark. */
  const smileCurve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.3, -0.42, 0.9),
        new THREE.Vector3(0, -0.62, 1.0),
        new THREE.Vector3(0.3, -0.42, 0.9),
      ),
    [],
  );

  useFrame(({ pointer, clock }, delta) => {
    const dt = Math.min(delta, 0.1);

    const t = clock.getElapsedTime();
    /**
     * Flustered while you are pointing at it, otherwise open with a blink.
     *
     * The blink is a fifth of a second every five and a half: much longer and it
     * stops reading as a blink and starts reading as a berry falling asleep. The
     * fluster still blinks, briefly showing the ordinary shut eye, which is what
     * keeps the squeezed pair from looking like a painted-on expression.
     */
    const blinking = t % BLINK_CYCLE > BLINK_CYCLE - BLINK_SHUT;
    eyeMode.current = hovered.current ? (blinking ? "shut" : "fluster") : blinking ? "shut" : "open";

    if (head.current) {
      // Leans toward the cursor rather than looking straight at it: a true
      // look-at on a sphere with a face reads as the head spinning off.
      // Flustered, it stops following and holds still.
      //
      // A squirm lived here before and was taken out, because at the amplitudes
      // tried it read as a shiver rather than as embarrassment. This is that
      // idea again but smaller and only while hovered: a head-tilt wobble on z,
      // with the lean held still underneath it so there is one movement to read
      // rather than two competing.
      const ty = hovered.current ? 0 : pointer.x * 0.62;
      const tx = hovered.current ? -0.12 : -pointer.y * 0.34;
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, ty, 9 * dt);
      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, tx, 7 * dt);

      shake.current = THREE.MathUtils.lerp(shake.current, hovered.current ? 1 : 0, 8 * dt);
      // Set rather than lerped: the amplitude is already eased, so lerping the
      // angle as well would drag the wobble behind itself and flatten it.
      head.current.rotation.z = Math.sin(t * 23) * 0.055 * shake.current;
      // Lifts a little, the way a face does when it is caught out.
      head.current.position.y = THREE.MathUtils.lerp(
        head.current.position.y,
        hovered.current ? 0.12 : 0,
        6 * dt,
      );
    }

    if (blush.current) {
      blush.current.children.forEach((c) => {
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = THREE.MathUtils.lerp(m.opacity, hovered.current ? 0.62 : 0, 7 * dt);
      });
    }

    /**
     * The gawk. How far the cursor sits from dead centre decides how far the jaw
     * drops, so it is most startled when you are furthest away and settles back
     * into a smile when you come to rest in front of it.
     */
    const reach = hovered.current ? 0 : Math.min(1, Math.hypot(pointer.x, pointer.y));
    const openness = Math.min(1, reach * 2.2);

    if (mouth.current) {
      mouth.current.scale.y = THREE.MathUtils.lerp(mouth.current.scale.y, 0.1 + reach * 0.5, 8 * dt);
      mouth.current.scale.x = THREE.MathUtils.lerp(mouth.current.scale.x, 0.5 + reach * 0.22, 8 * dt);
      const m = mouth.current.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.lerp(m.opacity, openness, 8 * dt);
    }
    if (smile.current) {
      // The two trade places, so there is never a smile inside an open mouth.
      const m = smile.current.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.lerp(m.opacity, 1 - openness, 8 * dt);
    }
  });

  return (
    <group ref={head}>
      {/*
        The hover target, at half his radius.
        
        It used to be the head itself, so he stopped tracking the cursor the
        instant it touched his silhouette — which is the moment he is most worth
        watching. A smaller sphere lets him keep following you well inside his
        own outline and only fluster when you really are pointing at him.
        
        Transparent rather than `visible={false}`: three skips invisible objects
        when raycasting, so hiding it would stop it being hoverable at all.
      */}
      <mesh
        onPointerOver={() => (hovered.current = true)}
        onPointerOut={() => (hovered.current = false)}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh castShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.42} metalness={0.05} />
      </mesh>
      <Calyx />
      <Eye side={-1} modeRef={eyeMode} />
      <Eye side={1} modeRef={eyeMode} />

      {/* Blush, out on the cheeks and clear of the eyes. Flattened onto the
          surface so it reads as colour on the skin rather than two balls. */}
      <group ref={blush}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.44, -0.14, 0.84]} scale={[0.17, 0.11, 0.05]}>
            <sphereGeometry args={[1, 18, 18]} />
            <meshBasicMaterial color="#fb7185" toneMapped={false} transparent opacity={0} />
          </mesh>
        ))}
      </group>

      {/* Resting smile */}
      <mesh ref={smile}>
        <tubeGeometry args={[smileCurve, 28, 0.045, 8, false]} />
        <meshBasicMaterial color="#0b0b14" toneMapped={false} transparent opacity={1} />
      </mesh>

      {/* The open mouth: a flattened sphere pushed just proud of the surface so
          it cannot z-fight with the berry it sits on. */}
      <mesh ref={mouth} position={[0, -0.44, 0.82]} scale={[0.5, 0.1, 0.4]}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial color="#0b0b14" toneMapped={false} transparent opacity={0} />
      </mesh>
    </group>
  );
}

export function BlueberryBot3D({ className }: { className?: string }) {
  return (
    // `relative` with the canvas filling it absolutely. Left to size itself
    // against a flex parent, the renderer measured before the column had
    // settled, kept a stale aspect, and drew the scene off to one side.
    <div className={cn("relative", className)}>
      <Canvas
        shadows
        // Raised to match: with a fuller calyx the silhouette's centre is above
        // the sphere's, and a camera on the equator framed him low.
        camera={{ position: [0, 0.22, 4.6], fov: 42 }}
        dpr={[1, 2]}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 1, -3]} intensity={0.35} color="#c4b5fd" />
          <Berry />
          <ContactShadows position={[0, -1.45, 0]} opacity={0.35} scale={7} blur={2.6} far={3} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default BlueberryBot3D;
