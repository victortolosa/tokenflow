
import React from 'react';
import './button.css';

export interface ButtonProps {
  /** Visual variant for the button */
  variant?: 'primary' | 'secondary' | 'flat';
  /** How large should the button be? */
  size?: 'small' | 'medium' | 'large';
  /** Button contents */
  label: string;
  /** Optional click handler */
  onClick?: () => void;
}

/** Primary UI component for user interaction */
export const Button = ({
  variant,
  size = 'medium',
  label,
  ...props
}: ButtonProps) => {
  const mode = `storybook-button--${variant ?? 'secondary'}`;

  // Convert size prop to the corresponding token suffix if needed, 
  // currently we'll just use the class mapping to tokens in CSS

  return (
    <button
      type="button"
      className={['storybook-button', `storybook-button--${size}`, mode].join(' ')}
      {...props}
    >
      {label}
    </button>
  );
};
