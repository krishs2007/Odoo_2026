// client/src/pages/Register.jsx
// Owned by Member 1.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';

const ROLES = ['FleetManager', 'Driver', 'SafetyOfficer', 'FinancialAnalyst'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: ROLES[0] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to register');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">TransitOps</h1>
        <p className="text-sm text-gray-500 mb-6">Create an account</p>

        {error && (
          <div className="mb-4 border border-gray-300 rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Name</label>
            <input
              className="w-full border border-gray-300 rounded-md p-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-md p-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-md p-2"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Role</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-black underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
