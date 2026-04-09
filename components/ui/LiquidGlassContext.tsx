import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

interface LiquidGlassContextType {
  mousePos: MousePosition;
  isDesktop: boolean;
}

const LiquidGlassContext = createContext<LiquidGlassContextType | undefined>(undefined);

export const LiquidGlassProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // Check if desktop (mouse support)
    setIsDesktop(window.matchMedia('(hover: hover)').matches);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <LiquidGlassContext.Provider value={{ mousePos, isDesktop }}>
      {children}
    </LiquidGlassContext.Provider>
  );
};

export const useLiquidGlass = () => {
  const context = useContext(LiquidGlassContext);
  if (!context) {
    throw new Error('useLiquidGlass must be used within LiquidGlassProvider');
  }
  return context;
};
