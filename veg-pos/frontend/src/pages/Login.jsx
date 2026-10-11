import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import { setAppLanguage } from '../i18n';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(username, password);
      if (loggedUser) {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.response?.data?.error || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900">
      <div className="card w-full max-w-sm">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            className="text-xs text-gray-500 underline"
            onClick={() => setAppLanguage(i18n.language === 'ta' ? 'en' : 'ta')}
          >
            {i18n.language === 'ta' ? 'English' : 'தமிழ்'}
          </button>
        </div>
        <h1 className="text-xl font-bold text-center mb-4 text-brand-800">{t('app_title')}</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">{t('login.username')}</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">{t('login.password')}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'உள்நுகிறது...' : t('login.login_button')}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-3 text-center">admin / Admin@123</p>
      </div>
    </div>
  );
}
