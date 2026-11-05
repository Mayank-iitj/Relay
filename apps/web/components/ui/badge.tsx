import React from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'critical' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const styles: Record<BadgeVariant, string> = {
    neutral: 'bg-[#1E2022] border-[#323539] text-[#9DA1A7]',
    success: 'bg-[#0F2E1B] border-[#1B5430] text-[#4ADE80]',
    warning: 'bg-[#382800] border-[#6E4F00] text-[#FACC15]',
    critical: 'bg-[#381212] border-[#682323] text-[#F87171]',
    info: 'bg-[#0C1E30] border-[#1B3C5E] text-[#60A5FA]',
  };

  const selectedStyle = styles[variant] || styles.neutral;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border rounded-sm text-[10px] font-mono tracking-wider uppercase ${selectedStyle} ${className}`}
    >
      {children}
    </span>
  );
};
