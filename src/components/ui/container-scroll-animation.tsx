import * as React from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";

export function ContainerScroll({ titleComponent, children, className }: { titleComponent: React.ReactNode; children: React.ReactNode; className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => { const update = () => setMobile(window.innerWidth <= 768); update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }, []);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], mobile ? [0.98, 1] : [0.99, 1]);
  return <section ref={containerRef} className={cn("relative py-10 sm:py-16", className)}><Header titleComponent={titleComponent} /><Card rotate={rotate} scale={scale}>{children}</Card></section>;
}

function Header({ titleComponent }: { titleComponent: React.ReactNode }) { return titleComponent ? <div className="mx-auto mb-6 max-w-5xl text-center">{titleComponent}</div> : null; }
function Card({ rotate, scale, children }: { rotate: MotionValue<number>; scale: MotionValue<number>; children: React.ReactNode }) { return <motion.div style={{ rotateX: rotate, scale, transformPerspective: 1000 }} className="mx-auto h-full w-full max-w-none">{children}</motion.div>; }

export default ContainerScroll;