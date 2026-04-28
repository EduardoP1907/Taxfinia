import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={[
            'w-full px-3 py-2 text-sm bg-white border rounded-lg transition-colors duration-150',
            'placeholder:text-slate-400 text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400',
            error ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400',
            icon ? 'pl-9' : '',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
};
