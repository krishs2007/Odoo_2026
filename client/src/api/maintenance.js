// client/src/api/maintenance.js
// Owned by Member 3.
import api from './axios';

export const listMaintenance = (params = {}) =>
  api.get('/maintenance', { params }).then((res) => res.data);

export const createMaintenance = (payload) =>
  api.post('/maintenance', payload).then((res) => res.data);

export const closeMaintenance = (id) =>
  api.patch(`/maintenance/${id}/close`, {}).then((res) => res.data);

// Cross-module read — Member 2 owns the vehicle endpoint
export const listAllVehicles = () => api.get('/vehicle').then((res) => res.data);
