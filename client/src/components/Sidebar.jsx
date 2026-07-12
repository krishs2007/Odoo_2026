import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { hasRole } = useAuth();

  const isActive = (path) => location.pathname === path;
  const linkClass = (path) =>
    `block px-4 py-2 rounded-md text-sm ${
      isActive(path) ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
    }`;

  return (
    <aside className="w-56 border-r border-gray-200 h-screen p-4 flex flex-col gap-1 sticky top-0">
      <h1 className="font-bold text-lg mb-4">TransitOps</h1>

      <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>

      {/* MEMBER_2 */}
      <Link to="/vehicles" className={linkClass('/vehicles')}>Vehicles</Link>
      <Link to="/drivers" className={linkClass('/drivers')}>Drivers</Link>

      {/* MEMBER_3 */}
      <Link to="/trips" className={linkClass('/trips')}>Trips</Link>
      <Link to="/maintenance" className={linkClass('/maintenance')}>Maintenance</Link>

      {/* MEMBER_4 */}
      {hasRole && hasRole('FleetManager', 'FinancialAnalyst') && (
        <>
          <Link to="/fuel" className={linkClass('/fuel')}>Fuel</Link>
          <Link to="/expenses" className={linkClass('/expenses')}>Expenses</Link>
          <Link to="/reports" className={linkClass('/reports')}>Reports</Link>
        </>
      )}
    </aside>
  );
}
