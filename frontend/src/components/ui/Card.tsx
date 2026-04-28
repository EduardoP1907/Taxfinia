import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-500 rounded-full" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
