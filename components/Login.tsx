import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from './AppContext';
import { getApiOrigin } from '../utils/apiOrigin';

function getMagicTokenFromUrl(): string | null {
  // App uses hash routing (/#/login). Token may arrive as:
  // - https://app.../#/login?token=...
  // - https://app.../?token=...#/login
  const href = window.location.href;
  try {
    const url = new URL(href);
    const direct = url.searchParams.get('token');
    if (direct) return direct;
  } catch {
    // ignore
  }

  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx === -1) return null;
  const qs = hash.slice(idx + 1);
  const params = new URLSearchParams(qs);
  return params.get('token');
}

const Login: React.FC = () => {
  const context = useContext(AppContext);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const magicToken = useMemo(() => getMagicTokenFromUrl(), []);

  if (!context) return null;
  const { refreshData } = context;

  async function finishLogin(data: any) {
    localStorage.setItem('auth_token', data.token);
    await refreshData();
  }

  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const base = getApiOrigin();
      if (!base) throw new Error('API base URL is not configured. Set VITE_API_BASE_URL.');

      const res = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Login failed (${res.status})`);
      }
      const data = await res.json();
      await finishLogin(data);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const base = getApiOrigin();
      if (!base) throw new Error('API base URL is not configured. Set VITE_API_BASE_URL.');

      const res = await fetch(`${base}/api/v1/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `OTP request failed (${res.status})`);
      }
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message || 'OTP request failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const base = getApiOrigin();
      if (!base) throw new Error('API base URL is not configured. Set VITE_API_BASE_URL.');

      const payload: any = magicToken ? { token: magicToken } : { email, code: otpCode };
      const res = await fetch(`${base}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `OTP verify failed (${res.status})`);
      }
      const data = await res.json();
      await finishLogin(data);

      // Clean token from URL to avoid replays on refresh
      if (magicToken) {
        const h = window.location.hash;
        const q = h.indexOf('?');
        if (q !== -1) {
          window.location.hash = h.slice(0, q);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'OTP verify failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!magicToken) return;
    // Auto-verify magic link token
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      await verifyOtp({ preventDefault: () => {} } as any);
    })();
    // magicToken intentionally only read once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="atlas-auth">
      <div className="atlas-card atlas-auth-card atlas-auth-card--blueprint">
        <div className="atlas-auth-header">
          <img className="atlas-auth-logo" src="/assets/atlas-logo-invert.png" alt="Atlas" />
        </div>

        <div className="atlas-label atlas-auth-title">Sign in</div>
        <div className="atlas-help atlas-auth-subtitle" style={{ marginTop: 6 }}>Load campaign context and assignments.</div>

        <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
          <form onSubmit={onPasswordSubmit} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="atlas-label">Email</label>
              <div style={{ marginTop: 6 }}>
                <input
                  className="atlas-input atlas-input--dark"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="atlas-label">Password</label>
              <div style={{ marginTop: 6 }}>
                <input
                  className="atlas-input atlas-input--dark"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error ? <div className="atlas-error">{error}</div> : null}

            <button type="submit" disabled={loading} className="atlas-btn atlas-btn-primary" style={{ width: '100%' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="atlas-auth-divider" style={{ paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="atlas-label">Sign in with a code</div>
                <div className="atlas-help" style={{ marginTop: 4 }}>We’ll email you a code and a sign-in link.</div>
              </div>
              <button
                type="button"
                onClick={requestOtp}
                disabled={loading || !email}
                className="atlas-btn atlas-btn-secondary atlas-btn-secondary--dark"
              >
                {loading ? 'Sending…' : otpSent ? 'Resend code' : 'Send code'}
              </button>
            </div>

            {!magicToken && otpSent && (
              <form onSubmit={verifyOtp} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                <div>
                  <label className="atlas-label">6-digit code</label>
                  <div style={{ marginTop: 6 }}>
                    <input
                      className="atlas-input atlas-input--dark atlas-mono"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || otpCode.trim().length < 6}
                  className="atlas-btn atlas-btn-primary"
                  style={{ width: '100%' }}
                >
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>
              </form>
            )}

            {magicToken ? <div className="atlas-help" style={{ marginTop: 10 }}>Signing you in from magic link…</div> : null}
          </div>

          <div className="atlas-help atlas-auth-footnote" style={{ fontSize: 11 }}>
            Using API: <span className="atlas-mono" style={{ wordBreak: 'break-all' }}>{getApiOrigin() || '(not set)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
