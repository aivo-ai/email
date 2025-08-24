import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

async function apiLogin(email: string, password: string): Promise<boolean> {
  try {
    const r = await fetch('http://localhost:8080/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!r.ok) return false;
    const data = await r.json().catch(()=>({token:'mock'}));
    localStorage.setItem('token', data.token || 'mock');
    return true;
  } catch { return false; }
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(()=>{ document.title = 'CEERION Webmail · Sign in'; }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const ok = await apiLogin(email.trim(), pw);
    if (!ok) { setErr('Invalid credentials'); return; }
    if (keep) localStorage.setItem('keepSignedIn', '1');
    nav('/app/inbox', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left hero panel */}
      <div className="hidden lg:flex lg:flex-1 relative">
        <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-2xl">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm mb-6">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">CEERION Webmail</h1>
                <h2 className="mt-4 text-3xl font-bold">Hello! Welcome back!</h2>
                <p className="mt-4 text-lg text-white/90">Log in with your Email and secured Password</p>
              </div>
              
              {/* Decorative elements */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-white/40"></div>
                  <div className="h-1 flex-1 rounded-full bg-white/20"></div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-white/40"></div>
                  <div className="h-1 flex-1 rounded-full bg-white/20"></div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-white/40"></div>
                  <div className="h-1 w-3/4 rounded-full bg-white/20"></div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-sm text-white/70">© {new Date().getFullYear()} CEERION. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900">Sign in</h3>
              <p className="mt-2 text-sm text-gray-600">Welcome back to your account</p>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  data-action="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-0 transition-colors"
                  placeholder="you@ceerion.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    data-action="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-0 transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    data-action="toggle-password"
                    onClick={() => setShow(!show)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {show ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="keep-signed-in"
                    type="checkbox"
                    checked={keep}
                    onChange={(e) => setKeep(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="keep-signed-in" className="ml-2 block text-sm text-gray-700">
                    Keep me signed in
                  </label>
                </div>
                <a
                  href="/forgot"
                  data-action="forgot"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot your password?
                </a>
              </div>

              {err && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{err}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                data-action="signin"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-white/70 group-hover:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </span>
                Sign in
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <span className="text-gray-400">Contact your administrator</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
