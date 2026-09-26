import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Brain, Mail, Lock, User, Shield, Eye, EyeOff } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'SUPPORT_AGENT' | 'SUPPORT_MANAGER' | 'ADMIN'>('SUPPORT_AGENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName, role);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const fillDemo = (demoRole: typeof role) => {
    setMode('signup');
    setRole(demoRole);
    setFullName(demoRole === 'CUSTOMER' ? 'Demo Customer' : demoRole === 'ADMIN' ? 'Admin User' : demoRole === 'SUPPORT_MANAGER' ? 'Manager User' : 'Agent User');
    setEmail(`demo.${demoRole.toLowerCase()}@resolveai.com`);
    setPassword('demo123456');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 items-center justify-center mb-4">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">ResolveAI</h1>
          <p className="text-sm text-slate-500 mt-1">AI-Powered Customer Support Platform</p>
        </div>

        <div className="card p-6">
          <div className="flex gap-1 mb-6 p-1 bg-slate-900/60 rounded-lg">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input className="input pl-10" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" required />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" className="input pl-10" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPassword ? 'text' : 'password'} className="input pl-10 pr-10" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Role</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value as typeof role)}>
                  <option value="CUSTOMER">Customer</option>
                  <option value="SUPPORT_AGENT">Support Agent</option>
                  <option value="SUPPORT_MANAGER">Support Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            )}

            {error && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="mt-4 card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Quick Demo Setup</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => fillDemo('SUPPORT_AGENT')} className="btn-secondary text-xs">Agent Account</button>
            <button onClick={() => fillDemo('SUPPORT_MANAGER')} className="btn-secondary text-xs">Manager Account</button>
            <button onClick={() => fillDemo('ADMIN')} className="btn-secondary text-xs">Admin Account</button>
            <button onClick={() => fillDemo('CUSTOMER')} className="btn-secondary text-xs">Customer Account</button>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">Click a role to pre-fill, then sign up.</p>
        </div>
      </div>
    </div>
  );
}
