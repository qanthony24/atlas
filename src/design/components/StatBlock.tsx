import React from 'react';
import { Card } from './Card';

export function StatBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card style={{ padding: 12, minWidth: 160 }}>
      <div className="atlas-label" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22 }}>{value}</div>
    </Card>
  );
}
