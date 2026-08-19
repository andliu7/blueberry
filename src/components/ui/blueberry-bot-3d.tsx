import { Suspense, useEffect, useMemo, useRef } from "react";
import { useInView } from "motion/react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeBerryBody, makeBloomMaterial } from "@/components/ui/berry-geometry";
import { cn } from "@/lib/utils";
import { MOOD_SHAPE, type BerryMood } from "@/lib/berryMood";



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


/** Seconds per blink cycle, and how much of it the eyes are shut. */
const BLINK_CYCLE = 5.4;
const BLINK_SHUT = 0.22;

function Berry({
  mood,
  interactive,
  spin,
  dragging,
  windowPointer,
}: {
  mood: BerryMood;
  interactive: boolean;
  /** Extra yaw from a drag, in radians, owned by the wrapper. */
  spin: React.RefObject<number>;
  /** Whether a drag is in progress. Owned by the wrapper, which sees the
      pointer even when it leaves the berry's silhouette mid-swing. */
  dragging: React.RefObject<boolean>;
  /**
   * The cursor anywhere on the page, in the same -1..1 space r3f uses.
   *
   * three's own `pointer` is measured against the canvas and stops updating the
   * moment the cursor leaves it, so a berry in a 288px box only ever saw a
   * 288px world and went still whenever you were anywhere else on the screen —
   * which is nearly always. Null means "not tracking"; then the canvas-local
   * pointer is used, which is right for a berry that is only a decoration.
   */
  windowPointer: React.RefObject<{ x: number; y: number } | null>;
}) {
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
  /** 1 the instant it is clicked, decaying to 0 over about a second. */
  const poke = useRef(0);
  const blush = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const smile = useRef<THREE.Mesh>(null);
  // Built once per mount. The bloom patches MeshStandardMaterial rather than
  // replacing it, so the berry keeps three's own lighting, shadows and tone
  // mapping instead of a hand-rolled shader that would reimplement all of it.
  const bodyGeo = useMemo(() => makeBerryBody(48), []);
  const bodyMat = useMemo(() => makeBloomMaterial(), []);
  useEffect(
    () => () => {
      bodyGeo.dispose();
      bodyMat.dispose();
    },
    [bodyGeo, bodyMat],
  );

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

  useFrame(({ pointer: canvasPointer, clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = clock.getElapsedTime();

    // The whole window when it is being tracked, the canvas otherwise.
    const pointer = windowPointer.current ?? canvasPointer;

    const shape = MOOD_SHAPE[mood];

    /**
     * A poke decays rather than being switched off.
     *
     * Clicking sets this to 1 and it falls back to 0 over about a second, which
     * is what makes the reaction a thing that happens and then is over. A
     * boolean would need a timer to clear it and would snap at both ends.
     */
    poke.current = Math.max(0, poke.current - dt * 1.1);
    const poked = poke.current;

    /**
     * Whether the face is currently reacting to you rather than wearing its
     * page's mood. Hovering an interactive berry makes it shy; poking it makes
     * it cheer. Both outrank the mood underneath, and both are temporary.
     */
    const shy = interactive && hovered.current && !dragging.current;
    const cheering = poked > 0.05;

    /**
     * The blink is a fifth of a second every five and a half: much longer and it
     * stops reading as a blink and starts reading as a berry falling asleep. It
     * runs under every mood except the ones whose eyes are already closed, where
     * there is nothing to blink.
     */
    const lidsDown = shape.eyes === "shut" || shape.eyes === "kind";
    const blinking = !lidsDown && t % BLINK_CYCLE > BLINK_CYCLE - BLINK_SHUT;

    if (blinking) eyeMode.current = "shut";
    else if (shy) eyeMode.current = "fluster";
    else if (cheering) eyeMode.current = "shut";
    else if (shape.eyes === "fluster") eyeMode.current = "fluster";
    else if (shape.eyes === "open") eyeMode.current = "open";
    else eyeMode.current = "shut";

    if (head.current) {
      /**
       * Where the head points, in order of who is allowed to decide.
       *
       * A drag wins outright, because the hand is on it. Otherwise a tracking
       * mood leans toward the cursor — a lean, not a look-at, since a true
       * look-at on a sphere with a face painted on one side reads as the head
       * spinning off. A mood that does not track sits at its own resting angle,
       * which is what makes `thinking` look away and `reading` look down.
       */
      const tracking = shape.tracks && !shy && !dragging.current;
      const ty = dragging.current
        ? spin.current
        : tracking
          ? pointer.x * 0.62
          : shape.lookY + spin.current;
      const tx = shy ? -0.12 : tracking ? -pointer.y * 0.34 : shape.lookX;

      // Snappier under the hand so the berry keeps up with a drag, softer
      // otherwise so idle movement stays lazy.
      const follow = dragging.current ? 18 : 9;
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, ty, follow * dt);
      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, tx, 7 * dt);

      shake.current = THREE.MathUtils.lerp(shake.current, shy ? 1 : 0, 8 * dt);
      // Set rather than lerped: the amplitude is already eased, so lerping the
      // angle as well would drag the wobble behind itself and flatten it.
      // The idle sway underneath is per-mood, so a focused berry barely moves
      // and a cheering one rolls.
      const idle = Math.sin(t * 1.1) * 0.035 * shape.sway;
      head.current.rotation.z = Math.sin(t * 23) * 0.055 * shake.current + idle;

      // Lifts when caught out, and hops when poked. The hop is a half sine over
      // the life of the poke, so it goes up and comes back down once.
      const hop = Math.sin(poked * Math.PI) * 0.3;
      head.current.position.y = THREE.MathUtils.lerp(
        head.current.position.y,
        (shy ? 0.12 : 0) + hop + Math.sin(t * 1.7) * 0.02 * shape.sway,
        6 * dt,
      );
    }

    if (blush.current) {
      const want = shy ? 0.62 : Math.max(shape.blush, cheering ? 0.7 : 0);
      blush.current.children.forEach((c) => {
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = THREE.MathUtils.lerp(m.opacity, want, 7 * dt);
      });
    }

    /**
     * The gawk, which only `curious` does.
     *
     * How far the cursor sits from dead centre decides how far the jaw drops, so
     * it is most startled when you are furthest away and settles back into a
     * smile when you come to rest in front of it. Every other mood sets its
     * mouth from the mood table instead, and a poke opens it regardless.
     */
    const reach =
      shape.tracks && !shy && !dragging.current ? Math.min(1, Math.hypot(pointer.x, pointer.y)) : 0;
    const gawk = Math.min(1, reach * 2.2);
    const openness = Math.max(gawk, cheering ? poked : 0, shape.mouth > 1.4 ? shape.mouth - 1.4 : 0);

    if (mouth.current) {
      mouth.current.scale.y = THREE.MathUtils.lerp(
        mouth.current.scale.y,
        0.1 + Math.max(reach, openness * 0.8) * 0.5,
        8 * dt,
      );
      mouth.current.scale.x = THREE.MathUtils.lerp(
        mouth.current.scale.x,
        0.5 + Math.max(reach, openness * 0.8) * 0.22,
        8 * dt,
      );
      const m = mouth.current.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.lerp(m.opacity, openness, 8 * dt);
    }
    if (smile.current) {
      // The two trade places, so there is never a smile inside an open mouth.
      //
      // The smile is not scaled to suit the mood, though it was for a moment.
      // Its curve is written in head coordinates around y = -0.42, so scaling
      // the mesh on y walks the whole mouth up toward the middle of the face
      // rather than flattening it in place. Mood changes the mouth by how far
      // it opens, which is the part that happens at the origin.
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
        onPointerOver={() => interactive && (hovered.current = true)}
        onPointerOut={() => interactive && (hovered.current = false)}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* The poke target, at his full size.

          Hovering and poking were the same half-radius sphere, which is right
          for one and wrong for the other. The small sphere exists so he keeps
          following you until the cursor is really on him rather than flustering
          the moment it crosses his outline. Clicking has no such subtlety: the
          outer two-thirds of his visible area simply did nothing when pressed,
          which is most of the berry, and is why poking him felt broken.

          Slightly proud of the skin so the press lands on this rather than on
          the berry behind it. */}
      <mesh
        onClick={() => {
          // Guarded on not having just been dragged, or letting go at the end
          // of a spin would also register as a prod.
          if (!interactive || dragging.current) return;
          poke.current = 1;
        }}
      >
        <sphereGeometry args={[1.02, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* One mesh for body and calyx. The calyx is a depression cut into the
          top pole of this same geometry rather than a second mesh, so there is
          no seam at the pole for the normal-driven bloom to catch on, and the
          crown squashes with the body instead of sitting on it like a hat.

          `mesh.scale` is left alone: resting oblateness is baked into the
          BufferGeometry, because scale belongs to the volume-preservation
          system and a non-unit rest state there would break 1/sqrt(scaleY). */}
      <mesh castShadow geometry={bodyGeo} material={bodyMat} />
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

export function BlueberryBot3D({
  className,
  mood = "curious",
  interactive = true,
  onActivate,
  trackWindow = false,
}: {
  className?: string;
  /** Which face to wear. See `lib/berryMood`. */
  mood?: BerryMood;
  /** Whether it answers the pointer at all. Off makes it a still portrait. */
  interactive?: boolean;
  /** Fired by a press that was not a drag. */
  onActivate?: () => void;
  /**
   * Follow the cursor anywhere on the page rather than only over the canvas.
   *
   * Off by default. A berry tucked into a corner of a folder page that swivels
   * to watch you type somewhere else is a distraction; the one that is the
   * subject of its screen should do exactly that.
   */
  trackWindow?: boolean;
}) {
  /**
   * Whether this berry is worth spending frames on.
   *
   * Every berry runs its own WebGL context and, by default, its own render loop
   * at sixty frames a second whether or not it is on screen. Two or three of
   * them on a long page kept the main thread busy enough that pointer events and
   * even IntersectionObserver callbacks arrived late or not at all: the berry
   * looked unresponsive because the page was too busy to answer, not because
   * nothing was listening.
   *
   * `frameloop="never"` parks the loop entirely when it scrolls away. No margin
   * here, unlike the lazy-load check in `Blueberry`: that one wants to be early,
   * this one wants to be exact.
   */
  const shell = useRef<HTMLDivElement>(null);
  const visible = useInView(shell);

  const spin = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const moved = useRef(0);

  /**
   * The cursor in -1..1 across the viewport, updated outside React.
   *
   * A ref rather than state because this changes on every mouse move and the
   * scene reads it once a frame; putting it in state would re-render the tree
   * a hundred times a second to hand the same number to a canvas.
   */
  const windowPointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!trackWindow) {
      windowPointer.current = null;
      return;
    }
    const onMove = (e: PointerEvent) => {
      windowPointer.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        // Negated to match three's convention, where up the screen is positive.
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [trackWindow]);

  /**
   * Drag to spin, handled on the wrapper rather than in the scene.
   *
   * A drag that starts on the berry regularly leaves its silhouette halfway
   * through, and three's pointer events end the moment it does — so a spin
   * begun on the fruit would stop dead the instant the cursor cleared it. The
   * div sees the whole gesture. `setPointerCapture` is what keeps it arriving
   * after the pointer leaves the element entirely.
   *
   * `moved` accumulates distance so a click can be told from a drag: a press
   * that travelled less than a few pixels is a poke, and the scene's own click
   * handler is left to deal with it.
   */
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    dragging.current = true;
    moved.current = 0;
    lastX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    moved.current += Math.abs(dx);
    // Half a turn across a 300px drag: enough that a flick spins him round,
    // little enough that a careless one does not.
    spin.current += (dx / 300) * Math.PI;
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    // Cleared on the next frame rather than now, so the click that follows this
    // pointerup still sees the drag and does not also fire a poke.
    const wasDrag = moved.current > 4;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (wasDrag) requestAnimationFrame(() => (dragging.current = false));
    else dragging.current = false;
    // A press that did not travel is a press, and only then does the berry act
    // as a link. This is what an `<a>` wrapper cannot do: to an anchor every
    // pointerup is a click, so spinning him navigated away mid-drag.
    if (!wasDrag) onActivate?.();
  };

  return (
    // `relative` with the canvas filling it absolutely. Left to size itself
    // against a flex parent, the renderer measured before the column had
    // settled, kept a stale aspect, and drew the scene off to one side.
    <div
      ref={shell}
      className={cn("relative", interactive && "cursor-grab active:cursor-grabbing", className)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      // Vertical scrolling still belongs to the page; only the horizontal axis
      // is claimed, so dragging the berry on a phone does not trap the scroll.
      style={{ touchAction: interactive ? "pan-y" : undefined }}
    >
      <Canvas
        // Raised to match: with a fuller calyx the silhouette's centre is above
        // the sphere's, and a camera on the equator framed him low.
        camera={{ position: [0, 0.22, 4.6], fov: 42 }}
        frameloop={visible ? "always" : "never"}
        // Capped at 1.5 rather than 2. A retina screen was rendering this at
        // four times the pixels for a berry a few hundred pixels wide, which is
        // most of its cost for a difference nobody can see on a sphere.
        dpr={[1, 1.5]}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 1, -3]} intensity={0.35} color="#c4b5fd" />
          <Berry
            mood={mood}
            interactive={interactive}
            spin={spin}
            dragging={dragging}
            windowPointer={windowPointer}
          />
          {/* No contact shadow.

              `ContactShadows` put a soft dark ellipse on an invisible floor
              under the berry. On a page with a real floor that sells the weight
              of an object; on a flat coloured surface it reads as a grey circle
              drawn around the fruit, which is the one thing a floating mascot
              must not have. The berry is lit from its own texture and needs no
              ground to sit on. */}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default BlueberryBot3D;
