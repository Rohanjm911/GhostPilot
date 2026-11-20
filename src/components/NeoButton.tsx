import React from 'react';

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'cyan' | 'danger' | 'neutral' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'font-mono font-bold tracking-tight uppercase inline-flex items-center justify-center gap-2 border-[2.5px] border-black transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 shadow-neo-sm hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
    md: 'text-sm px-4 py-2 shadow-neo hover:shadow-[5px_5px_0px_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000]',
    lg: 'text-base px-6 py-3 shadow-neo-lg hover:shadow-neo-xl hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-neo-sm',
  }[size];

  const variantStyles = {
    primary: 'bg-lime-acid text-black hover:bg-lime-glow',
    secondary: 'bg-yellow-electric text-black hover:bg-yellow-300',
    cyan: 'bg-cyan-cyber text-black hover:bg-cyan-300',
    danger: 'bg-coral-danger text-white hover:bg-red-500',
    neutral: 'bg-white text-black hover:bg-[#F4F4F0]',
    dark: 'bg-black text-white hover:bg-ink-charcoal',
  }[variant];

  const disabledStyles = disabled
    ? 'opacity-40 cursor-not-allowed hover:shadow-neo hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0 active:shadow-neo bg-zinc-200 text-zinc-500 border-zinc-400'
    : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-block">{icon}</span>}
      {children}
    </button>
  );
};
