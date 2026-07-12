import { useEffect, useState } from 'react';
import { listMaintenance, createMaintenance, closeMaintenance, listAllVehicles } from '../api/maintenance';

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });

  async function refresh() {
    setLoading(true);
    try {
      const params = {};
      if (vehicleFilter) params.vehicleId = vehicleFilter;
      if (statusFilter) params.status = statusFilter;
      const [l, v] = await Promise.all([listMaintenance(params), listAllVehicles()]);
      setLogs(l);
      setVehicles(v);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleFilter, statusFilter]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await createMaintenance({ ...form, cost: Number(form.cost) });
      setForm({ vehicleId: '', description: '', cost: '' });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create maintenance record');
    }
  }

  async function handleClose(id) {
    setError('');
    try {
      await closeMaintenance(id);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to close maintenance record');
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-black mb-6">Maintenance</h1>

      {error && (
        <div className="mb-4 border border-gray-400 rounded-md px-4 py-2 text-sm text-black bg-white">
          {error}
        </div>
      )}

      {/* Create maintenance form */}
      <form
        onSubmit={handleCreate}
        className="mb-8 border border-gray-200 rounded-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="md:col-span-3">
          <h2 className="text-sm font-medium text-black mb-2">New Maintenance Record</h2>
        </div>

        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={form.vehicleId}
          onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
          required
        >
          <option value="">Select vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.registrationNumber}
            </option>
          ))}
        </select>

        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Cost"
          type="number"
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: e.target.value })}
          required
        />

        <div className="md:col-span-3">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
          >
            Open Record
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Vehicle will be marked ⚠ In Shop and removed from the dispatch pool.
          </p>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Vehicle:</label>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          >
            <option value="">All</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Status:</label>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Maintenance table */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Cost</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  No maintenance records found.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100">
                <td className="px-4 py-2 text-black">{log.vehicle?.name}</td>
                <td className="px-4 py-2">{log.description}</td>
                <td className="px-4 py-2">{log.cost}</td>
                <td className="px-4 py-2">
                  {log.status === 'ACTIVE' ? '⚠ Active' : '✓ Closed'}
                </td>
                <td className="px-4 py-2">
                  {log.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleClose(log.id)}
                      className="border border-gray-300 rounded-md px-2 py-1 text-xs hover:bg-gray-100"
                    >
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
