import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/Button.jsx';
import { handleFormKeyDown } from '../utils/formNavigation';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-page p-4 font-sans text-ink overflow-hidden">
      {/* Subtle purple background ambient glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#8244AD]/10 blur-3xl" />

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="relative z-10 w-full max-w-sm rounded-3xl border border-border-soft bg-white p-6 sm:p-8 shadow-soft-lg">
        {/* Logo and Brand Header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8244AD] to-[#351442] text-white shadow-soft-md border border-white/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3L4 19h5l3-6 3 6h5L12 3z" fill="white" fillOpacity="0.9" stroke="none" />
              <path d="M12 9l-2.5 5h5L12 9z" fill="#351442" stroke="none" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            KC Agency
          </h1>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Distributor Billing &amp; Inventory
          </p>
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold text-ink">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="admin@example.com"
            required
          />
        </div>

        {/* Password Field */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-bold text-ink">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger-border bg-danger-bg p-2.5 text-xs font-semibold text-danger">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full py-3 text-sm font-bold shadow-soft"
          size="lg"
        >
          {submitting ? 'Signing in…' : 'Sign in to Dashboard'}
        </Button>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-ink-muted">
          <Sparkles size={12} className="text-primary" />
          <span>Smarter Distribution &middot; Better Business</span>
        </div>
      </form>
    </div>
  );
}
