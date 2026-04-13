'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FlipTextProps {
  children: string;
  className?: string;
}

export function FlipText({ children, className }: FlipTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <span className={cn("inline-flex", className)}>
      {children.split('').map((char, index) => (
        <motion.span
          key={index}
          className="inline-block cursor-pointer"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          animate={{
            rotateX: hoveredIndex === index ? 360 : 0,
            y: hoveredIndex === index ? -8 : 0,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

export default FlipText;
