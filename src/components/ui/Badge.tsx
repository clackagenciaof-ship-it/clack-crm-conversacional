import type { CSSProperties, ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  style?: CSSProperties;
  title?: string;
};

export function Badge({ children, style, title }: BadgeProps) {
  return (
    <span className="badge" style={style} title={title}>
      {children}
    </span>
  );
}
