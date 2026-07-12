import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getFuelEfficiency,
  getFleetUtilization,
  getOperationalCost,
  getRoi,
  downloadCsv,
} from '../api/reports';

// Grayscale-only per theme rule — no color fills, distinguish series with shade + pattern.
const GRAY_DARK = '#000000';
const GRAY_MID = '#6B7280';
const GRAY_LIGHT = '#D1D5DB';

function Panel({ title, exportType, children }) {
  return (
    <div className="border border-gray-200 rounded-md p-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-black">{title}</h2>
        <button
          onClick={() => downloadCsv(exportType)}
          className="bg-black text-white text-sm rounded-md px-3 py-1.5 hover:bg-gray-800"
        >
          Export CSV
        </button>
      </div>
      {children}
    </div>
  );
}

export default function Reports() {
  const [fuelEfficiency, setFuelEfficiency] = useState([]);
  const [utilization, setUtilization] = useState(null);
  const [operationalCost, setOperationalCost] = useState([]);
  const [roi, setRoi] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getFuelEfficiency(), getFleetUtilization(), getOperationalCost(), getRoi()])
      .then(([fe, fu, oc, r]) => {
        setFuelEfficiency(fe.data);
        setUtilization(fu.data);
        setOperationalCost(oc.data);
        setRoi(r.data);
      })
      .catch(() => setError('Could not load one or more reports'));
  }, []);

  const roiHasData = roi.some((r) => r.roi !== null);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-black mb-6">Reports &amp; Analytics</h1>

      {error && (
        <div className="mb-4 border border-gray-300 rounded-md p-3 text-sm text-black">
          {error}
        </div>
      )}

      <Panel title="Fuel Efficiency (km/L)" exportType="fuel-efficiency">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fuelEfficiency}>
            <CartesianGrid stroke={GRAY_LIGHT} strokeDasharray="3 3" />
            <XAxis dataKey="registrationNumber" stroke={GRAY_DARK} />
            <YAxis stroke={GRAY_DARK} />
            <Tooltip />
            <Bar dataKey="efficiencyKmPerLiter" name="km/L" fill={GRAY_MID} stroke={GRAY_DARK} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Fleet Utilization" exportType="utilization">
        {utilization && (
          <p className="text-sm text-gray-500 mb-3">
            {utilization.onTripCount} of {utilization.activeCount} active vehicles on trip —{' '}
            <span className="text-black font-medium">{utilization.utilizationPercent}%</span>
          </p>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={utilization?.perVehicle || []}>
            <CartesianGrid stroke={GRAY_LIGHT} strokeDasharray="3 3" />
            <XAxis dataKey="registrationNumber" stroke={GRAY_DARK} />
            <YAxis stroke={GRAY_DARK} />
            <Tooltip />
            <Bar dataKey="daysOnTrip" name="Days on trip" fill={GRAY_MID} stroke={GRAY_DARK} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Operational Cost" exportType="cost">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={operationalCost}>
            <CartesianGrid stroke={GRAY_LIGHT} strokeDasharray="3 3" />
            <XAxis dataKey="registrationNumber" stroke={GRAY_DARK} />
            <YAxis stroke={GRAY_DARK} />
            <Tooltip />
            <Legend />
            <Bar dataKey="fuelCost" name="Fuel" stackId="cost" fill={GRAY_DARK} />
            <Bar dataKey="maintenanceCost" name="Maintenance" stackId="cost" fill={GRAY_MID} />
            <Bar dataKey="expenseCost" name="Other Expenses" stackId="cost" fill={GRAY_LIGHT} stroke={GRAY_DARK} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="ROI" exportType="roi">
        {!roiHasData ? (
          <div className="text-sm text-gray-500 border border-gray-200 rounded-md p-4">
            ROI can't be computed yet — the schema has no <code>revenue</code> field on Vehicle.
            Ask Member 1 to add it, or leave ROI out of the demo. This panel is not showing
            fabricated numbers.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roi}>
              <CartesianGrid stroke={GRAY_LIGHT} strokeDasharray="3 3" />
              <XAxis dataKey="registrationNumber" stroke={GRAY_DARK} />
              <YAxis stroke={GRAY_DARK} />
              <Tooltip />
              <Bar dataKey="roi" name="ROI" fill={GRAY_MID} stroke={GRAY_DARK} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}