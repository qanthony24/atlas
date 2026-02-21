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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Atlas (Dev) Login</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to load Campaign Core.</p>

        <div className="mt-6 space-y-6">
          <form className="space-y-4" onSubmit={onPasswordSubmit}>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in (password)'}
          </button>
          </form>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-800">Sign in with a code</div>
                <div className="text-xs text-gray-500">We’ll email you a code and a sign-in link.</div>
              </div>
              <button
                type="button"
                onClick={requestOtp}
                disabled={loading || !email}
                className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-3 py-2 rounded-md disabled:opacity-60"
              >
                {loading ? 'Sending…' : otpSent ? 'Resend code' : 'Send code'}
              </button>
            </div>

            {!magicToken && otpSent && (
              <form className="mt-4 space-y-3" onSubmit={verifyOtp}>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">6-digit code</label>
                  <input
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otpCode.trim().length < 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-md disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>
              </form>
            )}

            {magicToken && (
              <div className="mt-3 text-xs text-gray-600">
                Signing you in from magic link…
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}

          <div className="text-[11px] text-gray-500">
            Using API: <code className="break-all">{getApiOrigin() || '(not set)'}</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
