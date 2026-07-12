// client/src/pages/Drivers.jsx
// Owned by Member 2.
// Same shared-component assumptions as Vehicles.jsx — see comment there.
import { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from '../api/driver';

const STATUS_OPTIONS = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];

const EMPTY_FORM = {
  name: '',
  licenseNumber: '',
  licenseCategory: '',
  licenseExpiryDate: '',
  contactNumber: '',
  safetyScore: '100',
  status: 'AVAILABLE',
};

function validateForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Required';
  if (!form.licenseNumber.trim()) errors.licenseNumber = 'Required';
  if (!form.licenseCategory.trim()) errors.licenseCategory = 'Required';
  if (!form.licenseExpiryDate) errors.licenseExpiryDate = 'Required';
  if (!form.contactNumber.trim()) errors.contactNumber = 'Required';
  if (form.safetyScore !== '' && Number(form.safetyScore) < 0) {
    errors.safetyScore = 'Must be >= 0';
  }
  return errors;
}

function isExpired(dateString) {
  return new Date(dateString).getTime() < Date.now();
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

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
      const data = await getDrivers(statusFilter ? { status: statusFilter } : {});
      setDrivers(data);
    } catch (err) {
      setLoadError(err?.response?.data?.error || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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

  function openEdit(driver) {
    setEditingId(driver.id);
    setForm({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiryDate: driver.licenseExpiryDate.slice(0, 10),
      contactNumber: driver.contactNumber,
      safetyScore: String(driver.safetyScore),
      status: driver.status,
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
      name: form.name.trim(),
      licenseNumber: form.licenseNumber.trim(),
      licenseCategory: form.licenseCategory.trim(),
      licenseExpiryDate: form.licenseExpiryDate,
      contactNumber: form.contactNumber.trim(),
      safetyScore: form.safetyScore === '' ? 100 : Number(form.safetyScore),
      status: form.status,
    };

    try {
      if (editingId) {
        await updateDriver(editingId, payload);
      } else {
        await createDriver(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setSubmitError(err?.response?.data?.error || 'Failed to save driver');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSuspend(driver) {
    if (!window.confirm(`Suspend driver ${driver.name}? They will be excluded from dispatch.`)) {
      return;
    }
    try {
      await deleteDriver(driver.id);
      await load();
    } catch (err) {
      setLoadError(err?.response?.data?.error || 'Failed to suspend driver');
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'licenseNumber', header: 'License No.' },
    { key: 'licenseCategory', header: 'Category' },
    {
      key: 'licenseExpiryDate',
      header: 'License Expiry',
      render: (row) => (
        <span>
          {new Date(row.licenseExpiryDate).toLocaleDateString()}
          {isExpired(row.licenseExpiryDate) && (
            <span className="ml-2 text-xs">⚠ Expired</span>
          )}
        </span>
      ),
    },
    { key: 'contactNumber', header: 'Contact' },
    { key: 'safetyScore', header: 'Safety Score' },
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
          {row.status !== 'SUSPENDED' && (
            <button
              className="text-sm underline hover:no-underline"
              onClick={() => handleSuspend(row)}
            >
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-black">Driver Management</h1>
        <Button onClick={openCreate}>+ Add Driver</Button>
      </div>

      <Card className="mb-4 p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            className="border border-gray-200 rounded-md px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Card>

      {loadError && (
        <div className="mb-4 text-sm border border-gray-300 rounded-md p-3">
          ⚠ {loadError}
        </div>
      )}

      <Card className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading drivers…</div>
        ) : (
          <Table columns={columns} rows={drivers} emptyMessage="No drivers found." />
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-md p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Driver' : 'Add Driver'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field
                label="Name"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                error={formErrors.name}
              />
              <Field
                label="License Number"
                value={form.licenseNumber}
                onChange={(v) => setForm((f) => ({ ...f, licenseNumber: v }))}
                error={formErrors.licenseNumber}
              />
              <Field
                label="License Category"
                value={form.licenseCategory}
                onChange={(v) => setForm((f) => ({ ...f, licenseCategory: v }))}
                error={formErrors.licenseCategory}
              />
              <Field
                label="License Expiry Date"
                type="date"
                value={form.licenseExpiryDate}
                onChange={(v) => setForm((f) => ({ ...f, licenseExpiryDate: v }))}
                error={formErrors.licenseExpiryDate}
              />
              <Field
                label="Contact Number"
                value={form.contactNumber}
                onChange={(v) => setForm((f) => ({ ...f, contactNumber: v }))}
                error={formErrors.contactNumber}
              />
              <Field
                label="Safety Score"
                type="number"
                value={form.safetyScore}
                onChange={(v) => setForm((f) => ({ ...f, safetyScore: v }))}
                error={formErrors.safetyScore}
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