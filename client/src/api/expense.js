import axiosClient from './axios';

export const createExpense = (data) => axiosClient.post('/expense', data);

export const getExpenses = (vehicleId) =>
  axiosClient.get('/expense', { params: vehicleId ? { vehicleId } : {} });