import React, { useContext, useState } from 'react';
import { AppContext } from './AppContext';
import { getApiOrigin } from '../utils/apiOrigin';

const Login: React.FC = () => {
  const context = useContext(AppContext);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!context) return null;
  const { client, refreshData } = context;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // RealDataClient exposes no explicit login method; call backend directly here.
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
      localStorage.setItem('auth_token', data.token);
      await refreshData();
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Atlas (Dev) Login</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to load Campaign Core.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-[11px] text-gray-500">
            Using API: <code className="break-all">{getApiOrigin() || '(not set)'}</code>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
