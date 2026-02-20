// utils/apiOrigin.ts
// Centralized resolution for the backend API origin.
//
// Phase 2 hardening goal: avoid "silent" production misconfig where VITE_API_BASE_URL
// is unset and the app accidentally calls relative /api/v1/* on the static host.

export function getApiOrigin(): string {
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL;
  const base = String(envBase || '').trim().replace(/\/$/, '');
  if (base) return base;

  // Production fallback for atlaswins.org deployments.
  // Prefer setting VITE_API_BASE_URL in hosting env, but this keeps prod usable.
  if (typeof window !== 'undefined') {
    const host = String(window.location?.hostname || '').toLowerCase();
    if (host.includes('atlaswins.org')) {
      return 'https://atlasbackendapi-production.up.railway.app';
    }
  }

  return '';
}
