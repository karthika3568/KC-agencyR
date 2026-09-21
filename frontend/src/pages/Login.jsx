import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/Button.jsx';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
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
    <div className="flex h-screen items-center justify-center bg-page">
      <form onSubmit={handleSubmit} className="card w-80 p-6">
        <div className="mb-6 flex flex-col items-center leading-none">
          <span className="brand-wordmark text-2xl">AJ Agency</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-ink-muted">
            Distributor Billing &amp; Inventory
          </span>
        </div>
        <label className="mb-1 block text-sm font-medium text-ink-muted">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mb-3"
          required
        />
        <label className="mb-1 block text-sm font-medium text-ink-muted">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mb-4"
          required
        />
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full" size="lg">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
