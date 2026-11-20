import React from 'react';

interface NeoBadgeProps {
  label: string;
  variant?: 'lime' | 'yellow' | 'cyan' | 'coral' | 'black' | 'white';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const NeoBadge: React.FC<NeoBadgeProps> = ({
  label,
  variant = 'lime',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const base =
    'font-mono font-bold tracking-wider inline-flex items-center gap-1.5 border-[2px] border-black select-none';

  const sizeStyle = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 shadow-[1.5px_1.5px_0px_#000]' : 'text-xs px-2.5 py-1 shadow-neo-sm';

  const variantStyle = {
    lime: 'bg-lime-acid text-black',
    yellow: 'bg-yellow-electric text-black',
    cyan: 'bg-cyan-cyber text-black',
    coral: 'bg-coral-danger text-white',
    black: 'bg-black text-white',
    white: 'bg-white text-black',
  }[variant];

  return (
    <span className={`${base} ${sizeStyle} ${variantStyle} ${className}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full border border-black ${
            variant === 'coral' ? 'bg-white' : variant === 'black' ? 'bg-lime-acid' : 'bg-black'
          }`}
        />
      )}
      [{label}]
    </span>
  );
};
