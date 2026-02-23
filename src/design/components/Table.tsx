import React from 'react';

export function Table(props: React.TableHTMLAttributes<HTMLTableElement>) {
  const { className, ...rest } = props;
  return (
    <div className="atlas-card" style={{ overflow: 'hidden' }}>
      <table
        className={className}
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
        {...rest}
      />
    </div>
  );
}
