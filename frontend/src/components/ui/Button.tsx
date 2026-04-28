import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed tracking-wide';

  const variants = {
    primary:   'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 shadow-sm',
    secondary: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white',
    outline:   'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100',
    danger:    'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando…
        </>
      ) : (
        children
      )}
    </button>
  );
};
