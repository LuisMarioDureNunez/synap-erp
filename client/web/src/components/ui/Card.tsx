// SYNAP - Componente Card
// Autor: Luis Mario Taboada Nunez LMTN

import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className, padding = 'md', hover = false }) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  };

  return (
    <div className={clsx(
      'bg-white dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-700 shadow-sm',
      hover && 'hover:shadow-md hover:border-synap-200 dark:hover:border-synap-800 transition-all duration-300',
      paddings[padding],
      className
    )}>
      {children}
    </div>
  );
};

export default Card;
