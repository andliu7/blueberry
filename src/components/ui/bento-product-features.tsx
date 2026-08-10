import * as React from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 180, damping: 20 },
  },
};

/** A responsive six-slot bento grid used by Blueberry's dashboard overview. */
export function BentoGridShowcase({
  integration,
  trackers,
  statistic,
  focus,
  productivity,
  shortcuts,
  className,
}: {
  integration: React.ReactNode;
  trackers: React.ReactNode;
  statistic: React.ReactNode;
  focus: React.ReactNode;
  productivity: React.ReactNode;
  shortcuts: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3 lg:auto-rows-[minmax(9.5rem,auto)]",
        className,
      )}
    >
      <motion.div variants={itemVariants} className="lg:row-span-3">{integration}</motion.div>
      <motion.div variants={itemVariants}>{trackers}</motion.div>
      <motion.div variants={itemVariants}>{statistic}</motion.div>
      <motion.div variants={itemVariants}>{focus}</motion.div>
      <motion.div variants={itemVariants}>{productivity}</motion.div>
      <motion.div variants={itemVariants} className="sm:col-span-2">{shortcuts}</motion.div>
    </motion.section>
  );
}

export default BentoGridShowcase;