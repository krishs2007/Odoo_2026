import instance from './axios';

// NOTE: this route lives under /reports (not /vehicle) because reports.routes.js
// is auto-mounted at /reports by the loader — see the comment in that file.
export const getVehicleTotalCost = (vehicleId) =>
  instance.get(`/reports/vehicle/${vehicleId}/total-cost`);

export const getFuelEfficiency = () => instance.get('/reports/fuel-efficiency');

export const getFleetUtilization = () => instance.get('/reports/fleet-utilization');

export const getOperationalCost = () => instance.get('/reports/operational-cost');

export const getRoi = () => instance.get('/reports/roi');

// Triggers a browser download of the CSV for the given report type.
export async function downloadCsv(type) {
  const response = await instance.get('/reports/export/csv', {
    params: { type },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${type}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}