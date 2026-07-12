// client/src/pages/Dashboard.jsx
// Owned by Member 1.
import { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card';
import { getKpis } from '../api/dashboard';

const STATUS_OPTIONS = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];

const KPI_LABELS = [
  { key: 'activeVehicles', label: 'Active Vehicles' },
  { key: 'availableVehicles', label: 'Available Vehicles' },
  { key: 'vehiclesInMaintenance', label: 'Vehicles in Maintenance' },
  { key: 'activeTrips', label: 'Active Trips' },
  { key: 'pendingTrips', label: 'Pending Trips' },
  { key: 'driversOnDuty', label: 'Drivers On Duty' },
  { key: 'fleetUtilizationPercent', label: 'Fleet Utilization %', suffix: '%' },
];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [filters, setFilters] = useState({ type: '', status: '', region: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getKpis(filters);
      setKpis(data);
    } catch {
      setError('Could not load dashboard KPIs');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-black mb-6">Dashboard</h1>

      <div className="border border-gray-200 rounded-md p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Vehicle Type</label>
          <input
            className="w-full border border-gray-300 rounded-md p-2"
            placeholder="e.g. Truck"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Status</label>
          <select
            className="w-full border border-gray-300 rounded-md p-2"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Region</label>
          <input
            className="w-full border border-gray-300 rounded-md p-2"
            placeholder="e.g. North"
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-gray-300 rounded-md p-3 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_LABELS.map(({ key, label, suffix }) => (
            <Card key={key}>
              <p className="text-sm text-gray-500 mb-1">{label}</p>
              <p className="text-2xl font-semibold text-black">
                {kpis ? kpis[key] : '—'}
                {suffix && kpis ? suffix : ''}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
