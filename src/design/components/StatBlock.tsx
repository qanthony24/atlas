import React from 'react';
import { Card } from './Card';

export function StatBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Card style={{ padding: 12, minWidth: 160, display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon ? (
        <div
          style={{
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-drafting)',
            color: 'var(--color-action)',
            background: 'rgba(244, 247, 249, 0.92)',
            flex: '0 0 auto',
          }}
        >
          {icon}
        </div>
      ) : null}
      <div>
        <div className="atlas-label" style={{ marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22 }}>{value}</div>
      </div>
    </Card>
  );
}
