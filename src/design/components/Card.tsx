import React from 'react';

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={['atlas-card', className].filter(Boolean).join(' ')} {...rest} />;
}
