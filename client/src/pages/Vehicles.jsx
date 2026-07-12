// client/src/pages/Vehicles.jsx
// Owned by Member 2.
//
// ASSUMPTIONS about Member 1's Hour-1 scaffold (verify once pulled):
// - Shared components exist at ../components/{Table,Card,Button,StatusBadge}
// - StatusBadge accepts a raw status enum string (e.g. "AVAILABLE") and renders the
//   icon+text mapping from 00_TEAM_PLAN.md itself (no color). If it doesn't exist yet,
//   swap in the local <Fallback /> below temporarily.
import { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../api/vehicle';

const VEHICLE_TYPES = ['Truck', 'Van', 'Trailer', 'Pickup', 'Other'];
const STATUS_OPTIONS = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];

const EMPTY_FORM = {
  registrationNumber: '',
  name: '',
  type: '',
  maxLoadCapacity: '',
  odometer: '',
  acquisitionCost: '',
  region: '',
  status: 'AVAILABLE',
};

function validateForm(form) {
  const errors = {};
  if (!form.registrationNumber.trim()) errors.registrationNumber = 'Required';
  if (!form.name.trim()) errors.name = 'Required';
  if (!form.type.trim()) errors.type = 'Required';
  if (form.maxLoadCapacity === '' || Number(form.maxLoadCapacity) < 0) {
    errors.maxLoadCapacity = 'Must be a number >= 0';
  }
  if (form.acquisitionCost === '' || Number(form.acquisitionCost) < 0) {
    errors.acquisitionCost = 'Must be a number >= 0';
  }
  if (form.odometer !== '' && Number(form.odometer) < 0) {
    errors.odometer = 'Must be >= 0';
  }
  return errors;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [filters, setFilters] = useState({ type: '', status: '', region: '' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getVehicles(filters);
      setVehicles(data);
    } catch (err) {
      setLoadError(err?.response?.data?.error || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSubmitError('');
    setModalOpen(true);
  }

  function openEdit(vehicle) {
    setEditingId(vehicle.id);
    setForm({
      registrationNumber: vehicle.registrationNumber,
      name: vehicle.name,
      type: vehicle.type,
      maxLoadCapacity: String(vehicle.maxLoadCapacity),
      odometer: String(vehicle.odometer ?? 0),
      acquisitionCost: String(vehicle.acquisitionCost),
      region: vehicle.region || '',
      status: vehicle.status,
    });
    setFormErrors({});
    setSubmitError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    const payload = {
      registrationNumber: form.registrationNumber.trim(),
      name: form.name.trim(),
      type: form.type,
      maxLoadCapacity: Number(form.maxLoadCapacity),
      odometer: form.odometer === '' ? 0 : Number(form.odometer),
      acquisitionCost: Number(form.acquisitionCost),
      region: form.region.trim() || null,
      status: form.status,
    };

    try {
      if (editingId) {
        await updateVehicle(editingId, payload);
      } else {
        await createVehicle(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      // Surface the clean 409 message from the backend for duplicate registration numbers.
      setSubmitError(err?.response?.data?.error || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetire(vehicle) {
    if (!window.confirm(`Retire vehicle ${vehicle.registrationNumber}? It will be excluded from dispatch.`)) {
      return;
    }
    try {
      await deleteVehicle(vehicle.id);
      await load();
    } catch (err) {
      setLoadError(err?.response?.data?.error || 'Failed to retire vehicle');
    }
  }

  const columns = [
    { key: 'registrationNumber', header: 'Reg. No.' },
    { key: 'name', header: 'Name / Model' },
    { key: 'type', header: 'Type' },
    { key: 'maxLoadCapacity', header: 'Max Load' },
    { key: 'odometer', header: 'Odometer' },
    { key: 'acquisitionCost', header: 'Acq. Cost' },
    { key: 'region', header: 'Region' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-2">
          <button
            className="text-sm underline hover:no-underline"
            onClick={() => openEdit(row)}
          >
            Edit
          </button>
          {row.status !== 'RETIRED' && (
            <button
              className="text-sm underline hover:no-underline"
              onClick={() => handleRetire(row)}
            >
              Retire
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-black">Vehicle Registry</h1>
        <Button onClick={openCreate}>+ Add Vehicle</Button>
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              className="border border-gray-200 rounded-md px-2 py-1 text-sm"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">All</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              className="border border-gray-200 rounded-md px-2 py-1 text-sm"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Region</label>
            <input
              className="border border-gray-200 rounded-md px-2 py-1 text-sm"
              placeholder="e.g. West"
              value={filters.region}
              onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      {loadError && (
        <div className="mb-4 text-sm border border-gray-300 rounded-md p-3">
          ⚠ {loadError}
        </div>
      )}

      <Card className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading vehicles…</div>
        ) : (
          <Table columns={columns} rows={vehicles} emptyMessage="No vehicles found." />
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-md p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Vehicle' : 'Add Vehicle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field
                label="Registration Number"
                value={form.registrationNumber}
                onChange={(v) => setForm((f) => ({ ...f, registrationNumber: v }))}
                error={formErrors.registrationNumber}
              />
              <Field
                label="Name / Model"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                error={formErrors.name}
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {formErrors.type && <p className="text-xs mt-1">⚠ {formErrors.type}</p>}
              </div>
              <Field
                label="Max Load Capacity"
                type="number"
                value={form.maxLoadCapacity}
                onChange={(v) => setForm((f) => ({ ...f, maxLoadCapacity: v }))}
                error={formErrors.maxLoadCapacity}
              />
              <Field
                label="Odometer"
                type="number"
                value={form.odometer}
                onChange={(v) => setForm((f) => ({ ...f, odometer: v }))}
                error={formErrors.odometer}
              />
              <Field
                label="Acquisition Cost"
                type="number"
                value={form.acquisitionCost}
                onChange={(v) => setForm((f) => ({ ...f, acquisitionCost: v }))}
                error={formErrors.acquisitionCost}
              />
              <Field
                label="Region"
                value={form.region}
                onChange={(v) => setForm((f) => ({ ...f, region: v }))}
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {submitError && <p className="text-sm">⚠ {submitError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, error, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs mt-1">⚠ {error}</p>}
    </div>
  );
}