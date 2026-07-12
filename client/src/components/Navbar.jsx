import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-gray-200 px-6 py-3 flex justify-between items-center">
      <span className="text-sm text-gray-600">
        {user ? `Signed in as ${user.name} (${user.role})` : ''}
      </span>
      {user && (
        <button onClick={logout} className="text-sm text-black hover:underline">
          Logout
        </button>
      )}
    </header>
  );
}