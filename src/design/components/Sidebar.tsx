import React from 'react';

// Placeholder shell: we will migrate the existing sidebar into this component in the next step.
export function AtlasSidebarShell({ children }: { children?: React.ReactNode }) {
  return (
    <aside
      style={{
        width: 240,
        background: 'var(--color-primary)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </aside>
  );
}
