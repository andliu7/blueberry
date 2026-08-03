import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * A magnifying glass over whatever it wraps. Moving the pointer inside masks a
 * circle of a scaled duplicate on top of the original.
 *
 * Two changes from the supplied file. It imports from `motion/react` rather
 * than `framer-motion`, which is the same library under its current name and
 * already a dependency here; installing both would put two animation engines in
 * one bundle. And the demo half is dropped, since it was built on shadcn tokens
 * (`bg-background`, `text-muted-foreground`) that this project never defines.
 *
 * Note it renders `children` twice, once flat and once scaled. That is fine for
 * an image, which the browser has already decoded, but do not wrap anything
 * stateful or expensive in it.
 */

interface LensProps {
  children: React.ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  position?: { x: number; y: number };
  isStatic?: boolean;
  hovering?: boolean;
  setHovering?: (hovering: boolean) => void;
  className?: string;
}

export const Lens: React.FC<LensProps> = ({
  children,
  zoomFactor = 2,
  lensSize = 150,
  isStatic = false,
  position = { x: 200, y: 150 },
  hovering,
  setHovering,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localIsHovering, setLocalIsHovering] = useState(false);
  const isHovering = hovering !== undefined ? hovering : localIsHovering;
  const setIsHovering = setHovering || setLocalIsHovering;
  const [mousePosition, setMousePosition] = useState({ x: 100, y: 100 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const at = isStatic ? position : mousePosition;

  // The glass itself: a hole in the middle so the magnified content shows
  // through, with a lit rim to read as a lens rather than a blur.
  const rim = (
    <motion.div
      initial={{ opacity: 0, scale: 0.58 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="pointer-events-none absolute z-[60]"
      style={{
        left: at.x - lensSize / 2,
        top: at.y - lensSize / 2,
        width: lensSize,
        height: lensSize,
        borderRadius: "50%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
        background:
          "radial-gradient(circle at center, transparent 60%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0.2) 80%, transparent 100%)",
      }}
    />
  );

  const glass = (
    <motion.div
      initial={{ opacity: 0, scale: 0.58 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute inset-0 overflow-hidden"
      style={{
        maskImage: `radial-gradient(circle ${lensSize / 2}px at ${at.x}px ${at.y}px, black 100%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(circle ${lensSize / 2}px at ${at.x}px ${at.y}px, black 100%, transparent 100%)`,
        transformOrigin: `${at.x}px ${at.y}px`,
        zIndex: 50,
      }}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `scale(${zoomFactor})`, transformOrigin: `${at.x}px ${at.y}px` }}
      >
        {children}
      </div>
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative z-20 cursor-none overflow-hidden rounded-lg ${className ?? ""}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      {children}

      {isStatic ? (
        <div>
          {glass}
          {rim}
        </div>
      ) : (
        <AnimatePresence>
          {isHovering && (
            <div>
              {glass}
              {rim}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default Lens;
