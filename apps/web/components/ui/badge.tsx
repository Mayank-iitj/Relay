import React from 'react';

export const Badge = ({ children, variant = 'neutral' }) => {
  const styles = {
    neutral: 'bg-[#1E2022] border-[#323539] text-[#9DA1A7]',
    success: 'bg-[#0F2E1B] border-[#1B5430] text-[#4ADE80]',
    warning: 'bg-[#382800] border-[#6E4F00] text-[#FACC15]',
    critical: 'bg-[#381212] border-[#682323] text-[#F87171]',
  };
  return (
    <span className={`px-2 py-0.5 border rounded text-xs font-mono ${styles[variant]}`}>
      {children}
    </span>
  );
};
