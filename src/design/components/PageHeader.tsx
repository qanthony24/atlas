import React from 'react';

export function PageHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <h1 className="atlas-h1">{title}</h1>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
