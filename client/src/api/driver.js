// client/src/api/driver.js
// Owned by Member 2.
import api from './axios';

export const getDrivers = (filters = {}) => {
  const params = {};
  if (filters.status) params.status = filters.status;
  return api.get('/driver', { params }).then((res) => res.data);
};

export const getDriver = (id) => api.get(`/driver/${id}`).then((res) => res.data);

export const createDriver = (payload) =>
  api.post('/driver', payload).then((res) => res.data);

export const updateDriver = (id, payload) =>
  api.put(`/driver/${id}`, payload).then((res) => res.data);

export const deleteDriver = (id) =>
  api.delete(`/driver/${id}`).then((res) => res.data);

export const getAvailableDrivers = () => getDrivers({ status: 'AVAILABLE' });
