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
    <Card style={{ padding: 16, minWidth: 180, display: 'flex', alignItems: 'center', gap: 14 }}>
      {icon ? (
        <div
          style={{
            width: 44,
            height: 44,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-drafting)',
            color: 'var(--color-action)',
            background: 'rgba(244, 247, 249, 0.92)',
            flex: '0 0 auto',
          }}
        >
          <div style={{ width: 28, height: 28, display: 'grid', placeItems: 'center' }}>{icon}</div>
        </div>
      ) : null}
      <div>
        <div className="atlas-label" style={{ marginBottom: 6, fontSize: 13 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 30 }}>{value}</div>
      </div>
    </Card>
  );
}
