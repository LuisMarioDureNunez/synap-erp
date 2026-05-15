// SYNAP - Componente Button
// Autor: Luis Mario Taboada Nunez LMTN

import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', loading, icon, className, ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-synap-500';
  
  const variants = {
    primary: 'bg-synap-600 text-white hover:bg-synap-700 shadow-lg shadow-synap-500/25 hover:shadow-synap-500/40',
    secondary: 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25',
    ghost: 'text-dark-600 hover:bg-dark-100 dark:text-dark-400 dark:hover:bg-dark-800',
    outline: 'border-2 border-synap-500 text-synap-600 hover:bg-synap-50 dark:text-synap-400 dark:hover:bg-synap-950',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button className={clsx(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
};

export default Button;
