// src/design/typography.ts

export const atlasTypography = {
  font: {
    heading: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    body: "'Public Sans', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  letterSpacing: {
    headingTight: '-0.02em',
    capsTracking: '0.06em',
  },
} as const;
