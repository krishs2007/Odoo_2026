const STATUS_MAP = {
  AVAILABLE: { icon: '✓', label: 'Available' },
  ON_TRIP: { icon: '→', label: 'On Trip' },
  IN_SHOP: { icon: '⚠', label: 'In Shop' },
  RETIRED: { icon: '✕', label: 'Retired' },
  OFF_DUTY: { icon: '⏸', label: 'Off Duty' },
  SUSPENDED: { icon: '✕', label: 'Suspended' },
  DRAFT: { icon: '○', label: 'Draft' },
  DISPATCHED: { icon: '→', label: 'Dispatched' },
  COMPLETED: { icon: '✓', label: 'Completed' },
  CANCELLED: { icon: '✕', label: 'Cancelled' },
  ACTIVE: { icon: '⚠', label: 'Active' },
  CLOSED: { icon: '✓', label: 'Closed' },
};

export default function StatusBadge({ status }) {
  const entry = STATUS_MAP[status] || { icon: '•', label: status };
  return (
    <span className="inline-flex items-center gap-1 text-sm border border-gray-300 rounded-md px-2 py-0.5">
      <span>{entry.icon}</span>
      <span>{entry.label}</span>
    </span>
  );
}