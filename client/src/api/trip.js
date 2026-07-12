// client/src/api/trip.js
// Owned by Member 3.
import api from './axios';

export const listTrips = (status) => {
  const params = status ? { status } : {};
  return api.get('/trip', { params }).then((res) => res.data);
};

export const createTrip = (payload) =>
  api.post('/trip', payload).then((res) => res.data);

export const dispatchTrip = (id) =>
  api.patch(`/trip/${id}/dispatch`, {}).then((res) => res.data);

export const completeTrip = (id, { finalOdometer, fuelConsumed }) =>
  api.patch(`/trip/${id}/complete`, { finalOdometer, fuelConsumed }).then((res) => res.data);

export const cancelTrip = (id) =>
  api.patch(`/trip/${id}/cancel`, {}).then((res) => res.data);

// Cross-module reads — Member 2 owns these endpoints, we only call them
export const listAvailableVehicles = () =>
  api.get('/vehicle', { params: { status: 'AVAILABLE' } }).then((res) => res.data);

export const listAvailableDrivers = () =>
  api.get('/driver', { params: { status: 'AVAILABLE' } }).then((res) => res.data);
