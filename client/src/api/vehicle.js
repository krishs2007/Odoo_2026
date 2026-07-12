// client/src/api/vehicle.js
// Owned by Member 2.
import api from './axios';

export const getVehicles = (filters = {}) => {
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  if (filters.region) params.region = filters.region;
  return api.get('/vehicle', { params }).then((res) => res.data);
};

export const getVehicle = (id) => api.get(`/vehicle/${id}`).then((res) => res.data);

export const createVehicle = (payload) =>
  api.post('/vehicle', payload).then((res) => res.data);

export const updateVehicle = (id, payload) =>
  api.put(`/vehicle/${id}`, payload).then((res) => res.data);

export const deleteVehicle = (id) =>
  api.delete(`/vehicle/${id}`).then((res) => res.data);

// Convenience helper — used by Trips.jsx/Maintenance.jsx dropdowns too.
export const getAvailableVehicles = () => getVehicles({ status: 'AVAILABLE' });
