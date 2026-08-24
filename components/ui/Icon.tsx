import React from 'react';

interface IconProps {
  name: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, className = '' }) => {
  return (
    <span className={`material-symbols-outlined select-none inline-block align-middle leading-none ${className}`}>
      {name}
    </span>
  );
};
