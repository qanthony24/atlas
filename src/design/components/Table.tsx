import React from 'react';

export type AtlasTableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  /** Wrap table in an Atlas card container (default true). */
  card?: boolean;
};

export function Table(props: AtlasTableProps) {
  const { className, card = true, ...rest } = props;

  const table = <table className={['atlas-table', className].filter(Boolean).join(' ')} {...rest} />;

  if (!card) return table;

  return (
    <div className="atlas-card" style={{ overflow: 'hidden' }}>
      {table}
    </div>
  );
}
