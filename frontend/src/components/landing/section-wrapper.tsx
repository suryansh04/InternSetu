import type { ReactNode } from "react";
import { motion } from "motion/react";

interface SectionWrapperProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Fades a section up into view the first time it scrolls on screen. */
export function SectionWrapper({ children, delay = 0, className = "" }: SectionWrapperProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
