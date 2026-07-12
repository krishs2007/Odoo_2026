// client/src/api/dashboard.js
// Owned by Member 1.
import api from './axios';

export const getKpis = (filters = {}) => {
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  if (filters.region) params.region = filters.region;
  return api.get('/dashboard/kpis', { params }).then((res) => res.data);
};
