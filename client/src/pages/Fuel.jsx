import { useEffect, useState } from 'react';
import { createFuelLog, getFuelLogs } from '../api/fuel';
// NOTE: assumes Member 2 exposes getVehicles() from '../api/vehicle'. Adjust import if named differently.
import { getVehicles } from '../api/vehicle';

export default function Fuel() {
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [form, setForm] = useState({ vehicleId: '', liters: '', cost: '', date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getVehicles()
      .then((data) => setVehicles(data))
      .catch(() => setError('Could not load vehicles'));
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  async function loadLogs() {
    try {
      const res = await getFuelLogs(selectedVehicleId || undefined);
      setLogs(res.data);
    } catch {
      setError('Could not load fuel logs');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.vehicleId || !form.liters || !form.cost) {
      setError('Vehicle, liters, and cost are required');
      return;
    }

    setLoading(true);
    try {
      await createFuelLog({
        vehicleId: Number(form.vehicleId),
        liters: Number(form.liters),
        cost: Number(form.cost),
        date: form.date || undefined,
      });
      setForm({ vehicleId: form.vehicleId, liters: '', cost: '', date: '' });
      await loadLogs();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save fuel log');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-black mb-6">Fuel Logs</h1>

      {error && (
        <div className="mb-4 border border-gray-300 rounded-md p-3 text-sm text-black">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border border-gray-200 rounded-md p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-sm text-gray-500 mb-1">Vehicle</label>
          <select
            className="w-full border border-gray-300 rounded-md p-2"
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.registrationNumber})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Liters</label>
          <input
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-md p-2"
            value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Cost</label>
          <input
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-md p-2"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Date</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-md p-2"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-4 bg-black text-white rounded-md py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Add Fuel Log'}
        </button>
      </form>

      <div className="mb-3">
        <label className="text-sm text-gray-500 mr-2">Filter by vehicle:</label>
        <select
          className="border border-gray-300 rounded-md p-2"
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.registrationNumber})
            </option>
          ))}
        </select>
      </div>

      <table className="w-full border border-gray-200 rounded-md text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">Vehicle</th>
            <th className="p-2">Liters</th>
            <th className="p-2">Cost</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-100">
              <td className="p-2">
                {log.vehicle ? `${log.vehicle.name} (${log.vehicle.registrationNumber})` : log.vehicleId}
              </td>
              <td className="p-2">{log.liters}</td>
              <td className="p-2">{log.cost}</td>
              <td className="p-2">{new Date(log.date).toLocaleDateString()}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td className="p-3 text-gray-500" colSpan={4}>
                No fuel logs yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}