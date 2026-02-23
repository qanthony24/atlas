import React from 'react';

type Variant = 'primary' | 'secondary' | 'critical';

export type AtlasButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button(props: AtlasButtonProps) {
  const { className, variant = 'secondary', ...rest } = props;
  const variantClass =
    variant === 'primary'
      ? 'atlas-btn-primary'
      : variant === 'critical'
        ? 'atlas-btn-critical'
        : 'atlas-btn-secondary';

  return <button className={['atlas-btn', variantClass, className].filter(Boolean).join(' ')} {...rest} />;
}
