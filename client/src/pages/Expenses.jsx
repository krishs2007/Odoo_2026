import { useEffect, useState } from 'react';
import { createExpense, getExpenses } from '../api/expense';
import { getVehicles } from '../api/vehicle';

const EXPENSE_TYPES = ['toll', 'other'];

export default function Expenses() {
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [form, setForm] = useState({ vehicleId: '', type: 'toll', amount: '', date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getVehicles()
      .then((data) => setVehicles(data))
      .catch(() => setError('Could not load vehicles'));
  }, []);

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  async function loadExpenses() {
    try {
      const res = await getExpenses(selectedVehicleId || undefined);
      setExpenses(res.data);
    } catch {
      setError('Could not load expenses');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.vehicleId || !form.amount) {
      setError('Vehicle and amount are required');
      return;
    }

    setLoading(true);
    try {
      await createExpense({
        vehicleId: Number(form.vehicleId),
        type: form.type,
        amount: Number(form.amount),
        date: form.date || undefined,
      });
      setForm({ vehicleId: form.vehicleId, type: 'toll', amount: '', date: '' });
      await loadExpenses();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-black mb-6">Expenses</h1>

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
          <label className="block text-sm text-gray-500 mb-1">Type</label>
          <select
            className="w-full border border-gray-300 rounded-md p-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {EXPENSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-md p-2"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
          {loading ? 'Saving...' : 'Add Expense'}
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
            <th className="p-2">Type</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id} className="border-b border-gray-100">
              <td className="p-2">
                {exp.vehicle ? `${exp.vehicle.name} (${exp.vehicle.registrationNumber})` : exp.vehicleId}
              </td>
              <td className="p-2">{exp.type}</td>
              <td className="p-2">{exp.amount}</td>
              <td className="p-2">{new Date(exp.date).toLocaleDateString()}</td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr>
              <td className="p-3 text-gray-500" colSpan={4}>
                No expenses yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}