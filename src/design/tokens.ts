// src/design/tokens.ts
// Canonical UI tokens per Atlas Style Guide. Do not introduce ad-hoc colors.

export const atlasTokens = {
  color: {
    surface: '#F4F7F9', // Blueprint White
    primary: '#1B365D', // Architect Blue
    action: '#00A3E0',  // Drafting Cyan
    critical: '#FF8200', // Caution Orange
    text: '#333333',    // Graphite
    border: '#D1D9E0',
    gridLine: 'rgba(27, 54, 93, 0.05)',
  },
  radius: {
    drafting: '2px',
  },
  spacing: {
    grid: 8,
  },
} as const;

export type AtlasTokens = typeof atlasTokens;
