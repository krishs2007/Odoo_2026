// NOTE: assumes a shared authed axios instance at './axiosClient' (baseURL '/api',
// Authorization header attached via interceptor from AuthContext). Rename the import
// if Member 1's scaffold names this file differently.
import instance from './axios';

export const createFuelLog = (data) => instance.post('/fuel', data);

export const getFuelLogs = (vehicleId) =>
  instance.get('/fuel', { params: vehicleId ? { vehicleId } : {} });