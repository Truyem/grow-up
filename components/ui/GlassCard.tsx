import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", title, icon }) => {
  return (
    <div className={`
      relative overflow-hidden
      bg-white/5 backdrop-blur-xl 
      border border-white/10 
      shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
      rounded-3xl p-6
      transition-all duration-300 hover:bg-white/10
      ${className}
    `}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
          {icon && <div className="text-cyan-400">{icon}</div>}
          {title && <h3 className="text-xl font-semibold text-white/90 tracking-tight">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
};