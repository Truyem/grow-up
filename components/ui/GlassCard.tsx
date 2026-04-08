import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", title, icon, ...props }) => {
  return (
    <div
      {...props}
      className={`
      group/card relative overflow-hidden
      bg-black/20
      backdrop-blur-md
      border border-white/10 
      shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
      rounded-3xl p-6
      transition-all duration-300 
      hover:bg-black/30
      hover:border-white/20
      hover:shadow-[0_8px_40px_0_rgba(6,182,212,0.15)]
      ${className}
    `}>
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10 rounded-3xl" />
      </div>

      {(title || icon) && (
        <div className="relative z-10 flex items-center gap-3 mb-4 pb-3 border-b border-white/10 group-hover/card:border-white/20 transition-colors">
          {icon && <div className="text-cyan-400 group-hover/card:text-cyan-300 transition-colors">{icon}</div>}
          {title && <h3 className="text-xl font-semibold text-white/90 tracking-tight">{title}</h3>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};