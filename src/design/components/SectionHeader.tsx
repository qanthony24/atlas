import React from 'react';

export function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="atlas-label">{title}</div>
    </div>
  );
}
