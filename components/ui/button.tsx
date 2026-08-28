import type { ButtonHTMLAttributes, ReactNode } from 'react';

export default function Button({ variant = 'default', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger'; children: ReactNode }) {
  return <button className={`ui-button ui-button-${variant}`} {...props}>{children}</button>;
}
