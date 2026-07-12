import { useEffect, useState } from 'react';
import {
  listTrips,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  listAvailableVehicles,
  listAvailableDrivers,
} from '../api/trip';

const STATUS_LABEL = {
  DRAFT: '● Draft',
  DISPATCHED: '→ Dispatched',
  COMPLETED: '✓ Completed',
  CANCELLED: '✕ Cancelled',
};

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    source: '',
    destination: '',
    vehicleId: '',
    driverId: '',
    cargoWeight: '',
    plannedDistance: '',
  });

  const [completeModal, setCompleteModal] = useState(null); // trip id or null
  const [completeForm, setCompleteForm] = useState({ finalOdometer: '', fuelConsumed: '' });

  async function refresh() {
    setLoading(true);
    try {
      const [t, v, d] = await Promise.all([
        listTrips(statusFilter || undefined),
        listAvailableVehicles(),
        listAvailableDrivers(),
      ]);
      setTrips(t);
      setVehicles(v);
      setDrivers(d);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicleId));

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await createTrip({
        ...form,
        cargoWeight: Number(form.cargoWeight),
        plannedDistance: Number(form.plannedDistance),
      });
      setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '' });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create trip');
    }
  }

  async function handleDispatch(id) {
    setError('');
    try {
      await dispatchTrip(id);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to dispatch trip');
    }
  }

  async function handleCancel(id) {
    setError('');
    try {
      await cancelTrip(id);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to cancel trip');
    }
  }

  async function handleComplete(e) {
    e.preventDefault();
    setError('');
    try {
      await completeTrip(completeModal, {
        finalOdometer: Number(completeForm.finalOdometer),
        fuelConsumed: Number(completeForm.fuelConsumed),
      });
      setCompleteModal(null);
      setCompleteForm({ finalOdometer: '', fuelConsumed: '' });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to complete trip');
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-black mb-6">Trips</h1>

      {error && (
        <div className="mb-4 border border-gray-400 rounded-md px-4 py-2 text-sm text-black bg-white">
          {error}
        </div>
      )}

      {/* Create trip form */}
      <form
        onSubmit={handleCreate}
        className="mb-8 border border-gray-200 rounded-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="md:col-span-3">
          <h2 className="text-sm font-medium text-black mb-2">New Trip (Draft)</h2>
        </div>

        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Source"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          required
        />
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Destination"
          value={form.destination}
          onChange={(e) => setForm({ ...form, destination: e.target.value })}
          required
        />
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Planned distance (km)"
          type="number"
          value={form.plannedDistance}
          onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })}
          required
        />

        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={form.vehicleId}
          onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
          required
        >
          <option value="">Select vehicle (available)</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.registrationNumber}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={form.driverId}
          onChange={(e) => setForm({ ...form, driverId: e.target.value })}
          required
        >
          <option value="">Select driver (available)</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div>
          <input
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
            placeholder="Cargo weight"
            type="number"
            value={form.cargoWeight}
            onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })}
            required
          />
          {selectedVehicle && (
            <p className="text-xs text-gray-500 mt-1">
              Max capacity: {selectedVehicle.maxLoadCapacity}
            </p>
          )}
        </div>

        <div className="md:col-span-3">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
          >
            Create Trip
          </button>
        </div>
      </form>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-500">Filter by status:</label>
        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Trip table */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2">Route</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">Cargo</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && trips.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No trips found.
                </td>
              </tr>
            )}
            {trips.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="px-4 py-2 text-black">
                  {t.source} → {t.destination}
                </td>
                <td className="px-4 py-2">{t.vehicle?.name}</td>
                <td className="px-4 py-2">{t.driver?.name}</td>
                <td className="px-4 py-2">{t.cargoWeight}</td>
                <td className="px-4 py-2">{STATUS_LABEL[t.status] || t.status}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    {t.status === 'DRAFT' && (
                      <button
                        onClick={() => handleDispatch(t.id)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs hover:bg-gray-100"
                      >
                        Dispatch
                      </button>
                    )}
                    {t.status === 'DISPATCHED' && (
                      <>
                        <button
                          onClick={() => setCompleteModal(t.id)}
                          className="border border-gray-300 rounded-md px-2 py-1 text-xs hover:bg-gray-100"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleCancel(t.id)}
                          className="border border-gray-300 rounded-md px-2 py-1 text-xs hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Complete trip modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleComplete}
            className="bg-white border border-gray-200 rounded-md p-6 w-full max-w-sm"
          >
            <h2 className="text-sm font-medium text-black mb-4">Complete Trip</h2>
            <label className="block text-xs text-gray-500 mb-1">Final odometer</label>
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full mb-3"
              type="number"
              value={completeForm.finalOdometer}
              onChange={(e) => setCompleteForm({ ...completeForm, finalOdometer: e.target.value })}
              required
            />
            <label className="block text-xs text-gray-500 mb-1">Fuel consumed</label>
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full mb-4"
              type="number"
              value={completeForm.fuelConsumed}
              onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumed: e.target.value })}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteModal(null)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-black text-white px-3 py-2 rounded-md text-sm hover:bg-gray-800"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
