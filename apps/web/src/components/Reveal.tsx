import { motion, useReducedMotion, type Variant } from 'framer-motion';
import type { ReactNode } from 'react';
import { motion as tokenMotion } from '@/theme/tokens';

interface RevealProps {
  children: ReactNode;
  /** stagger delay in seconds */
  delay?: number;
  y?: number;
  once?: boolean;
}

/**
 * Scroll-reveal wrapper. Fully respects prefers-reduced-motion (renders static).
 * Used sparingly to guide attention — not on every element.
 */
export function Reveal({ children, delay = 0, y = 18, once = true }: RevealProps) {
  const reduce = useReducedMotion();

  const hidden: Variant = reduce ? { opacity: 1 } : { opacity: 0, y };
  const visible: Variant = reduce
    ? { opacity: 1 }
    : { opacity: 1, y: 0, transition: { duration: tokenMotion.slow, ease: tokenMotion.ease, delay } };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-80px' }}
      variants={{ hidden, visible }}
    >
      {children}
    </motion.div>
  );
}
