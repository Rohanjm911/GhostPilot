import React from 'react';

interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  headerColor?: string;
  title?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const NeoCard: React.FC<NeoCardProps> = ({
  children,
  className = '',
  headerColor = 'bg-white',
  title,
  badge,
  actions,
}) => {
  return (
    <div className={`bg-white border-[2.5px] border-black shadow-neo overflow-hidden ${className}`}>
      {title && (
        <div className={`px-4 py-2.5 border-b-[2.5px] border-black flex items-center justify-between ${headerColor}`}>
          <div className="flex items-center gap-2">
            <h3 className="font-mono font-bold text-sm uppercase tracking-wide text-black">{title}</h3>
            {badge}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};
