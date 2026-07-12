// server/src/controllers/dashboard.controller.js
// Owned by Member 1.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/dashboard/kpis?type=&status=&region=
// Filters apply to the vehicle-based KPIs (type/status/region narrow the fleet
// being counted). Driver and trip KPIs are fleet-wide and unaffected by them.
async function getKpis(req, res) {
  try {
    const { type, status, region } = req.query;

    const vehicleWhere = {};
    if (type) vehicleWhere.type = type;
    if (region) vehicleWhere.region = region;
    if (status) vehicleWhere.status = status;

    const [
      activeVehicles,
      availableVehicles,
      inMaintenanceVehicles,
      nonRetiredVehicles,
      onTripVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { ...vehicleWhere, status: { not: 'RETIRED' } } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: 'IN_SHOP' } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: { not: 'RETIRED' } } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: 'ON_TRIP' } }),
      prisma.trip.count({ where: { status: 'DISPATCHED' } }),
      prisma.trip.count({ where: { status: 'DRAFT' } }),
      prisma.driver.count({ where: { status: 'ON_TRIP' } }),
    ]);

    const fleetUtilizationPercent =
      nonRetiredVehicles > 0 ? Math.round((onTripVehicles / nonRetiredVehicles) * 10000) / 100 : 0;

    return res.json({
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance: inMaintenanceVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilizationPercent,
    });
  } catch (err) {
    console.error('getKpis error:', err);
    return res.status(500).json({ error: 'Failed to compute dashboard KPIs' });
  }
}

module.exports = { getKpis };
