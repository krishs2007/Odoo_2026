const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ------------------------------------------------------------------ */
/* Shared aggregation helpers (reused by JSON endpoints + CSV export) */
/* ------------------------------------------------------------------ */

async function getVehiclesForReports() {
  return prisma.vehicle.findMany({
    where: { status: { not: 'RETIRED' } },
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      status: true,
      acquisitionCost: true,
      // NOTE: no `revenue` field exists on Vehicle in the frozen schema (see
      // MEMBER_4_TASKS.md — flagged, not invented). Selecting a nonexistent Prisma
      // field throws a validation error at runtime, so it is intentionally omitted
      // here. computeRoi() below treats revenue as always unavailable until the
      // team decides to add it via a signed-off migration.
    },
  });
}

// per vehicle: totalDistance (sum trip.actualDistance) / totalFuel (sum fuelLog.liters)
async function computeFuelEfficiency() {
  const vehicles = await getVehiclesForReports();

  const results = await Promise.all(
    vehicles.map(async (v) => {
      const [distanceAgg, fuelAgg] = await Promise.all([
        prisma.trip.aggregate({
          where: { vehicleId: v.id, actualDistance: { not: null } },
          _sum: { actualDistance: true },
        }),
        prisma.fuelLog.aggregate({
          where: { vehicleId: v.id },
          _sum: { liters: true },
        }),
      ]);

      const totalDistance = distanceAgg._sum.actualDistance || 0;
      const totalFuel = fuelAgg._sum.liters || 0;
      const efficiency = totalFuel > 0 ? totalDistance / totalFuel : null; // null = no fuel logged yet, avoid divide-by-zero

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        registrationNumber: v.registrationNumber,
        totalDistance,
        totalFuel,
        efficiencyKmPerLiter: efficiency,
      };
    })
  );

  return results;
}

// fleet-wide %: count(ON_TRIP) / count(status != RETIRED), plus per-vehicle days-on-trip
async function computeFleetUtilization() {
  const [onTripCount, activeCount, vehicles] = await Promise.all([
    prisma.vehicle.count({ where: { status: 'ON_TRIP' } }),
    prisma.vehicle.count({ where: { status: { not: 'RETIRED' } } }),
    getVehiclesForReports(),
  ]);

  const utilizationPercent = activeCount > 0 ? (onTripCount / activeCount) * 100 : 0;

  // Per-vehicle days-on-trip: sum of (completedAt - dispatchedAt) across completed trips.
  const perVehicle = await Promise.all(
    vehicles.map(async (v) => {
      const trips = await prisma.trip.findMany({
        where: {
          vehicleId: v.id,
          status: 'COMPLETED',
          dispatchedAt: { not: null },
          completedAt: { not: null },
        },
        select: { dispatchedAt: true, completedAt: true },
      });

      const daysOnTrip = trips.reduce((sum, t) => {
        const ms = new Date(t.completedAt).getTime() - new Date(t.dispatchedAt).getTime();
        return sum + Math.max(ms, 0) / (1000 * 60 * 60 * 24);
      }, 0);

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        registrationNumber: v.registrationNumber,
        status: v.status,
        daysOnTrip: Math.round(daysOnTrip * 100) / 100,
      };
    })
  );

  return {
    onTripCount,
    activeCount,
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    perVehicle,
  };
}

// per vehicle: sum(fuelLogs.cost) + sum(maintenanceLogs.cost) + sum(expenses.amount)
async function computeOperationalCost() {
  const vehicles = await getVehiclesForReports();

  const results = await Promise.all(
    vehicles.map(async (v) => {
      const [fuelAgg, maintAgg, expenseAgg] = await Promise.all([
        prisma.fuelLog.aggregate({ where: { vehicleId: v.id }, _sum: { cost: true } }),
        prisma.maintenanceLog.aggregate({ where: { vehicleId: v.id }, _sum: { cost: true } }),
        prisma.expense.aggregate({ where: { vehicleId: v.id }, _sum: { amount: true } }),
      ]);

      const fuelCost = fuelAgg._sum.cost || 0;
      const maintenanceCost = maintAgg._sum.cost || 0;
      const expenseCost = expenseAgg._sum.amount || 0;

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        registrationNumber: v.registrationNumber,
        fuelCost,
        maintenanceCost,
        expenseCost,
        totalOperationalCost: fuelCost + maintenanceCost + expenseCost,
      };
    })
  );

  return results;
}

// per vehicle: (revenue - (maintenanceCost + fuelCost)) / acquisitionCost
//
// FLAG: `revenue` does NOT exist on the Vehicle model in the frozen schema.
// This was raised explicitly in MEMBER_4_TASKS.md — we are NOT inventing a number.
// Until the team decides (a) add optional Vehicle.revenue via a migration Member 1 runs,
// or (b) skip ROI in the demo, this returns roi: null with a note instead of faking data.
async function computeRoi() {
  const vehicles = await getVehiclesForReports();

  const results = await Promise.all(
    vehicles.map(async (v) => {
      const [fuelAgg, maintAgg] = await Promise.all([
        prisma.fuelLog.aggregate({ where: { vehicleId: v.id }, _sum: { cost: true } }),
        prisma.maintenanceLog.aggregate({ where: { vehicleId: v.id }, _sum: { cost: true } }),
      ]);

      const fuelCost = fuelAgg._sum.cost || 0;
      const maintenanceCost = maintAgg._sum.cost || 0;
      const revenue = v.revenue; // undefined until schema is migrated

      const hasRevenue = typeof revenue === 'number';
      const roi = hasRevenue && v.acquisitionCost > 0
        ? (revenue - (maintenanceCost + fuelCost)) / v.acquisitionCost
        : null;

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        registrationNumber: v.registrationNumber,
        acquisitionCost: v.acquisitionCost,
        fuelCost,
        maintenanceCost,
        revenue: hasRevenue ? revenue : null,
        roi,
        note: hasRevenue ? null : 'revenue field not yet on Vehicle schema — ROI cannot be computed',
      };
    })
  );

  return results;
}

/* ------------------------------------------------------------------ */
/* HTTP handlers                                                      */
/* ------------------------------------------------------------------ */

// GET /api/vehicle/:id/total-cost  -> sum(fuelLogs.cost) + sum(maintenanceLogs.cost)
async function getVehicleTotalCost(req, res) {
  try {
    const vehicleId = Number(req.params.id);

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const [fuelAgg, maintAgg] = await Promise.all([
      prisma.fuelLog.aggregate({ where: { vehicleId }, _sum: { cost: true } }),
      prisma.maintenanceLog.aggregate({ where: { vehicleId }, _sum: { cost: true } }),
    ]);

    const fuelCost = fuelAgg._sum.cost || 0;
    const maintenanceCost = maintAgg._sum.cost || 0;

    return res.json({
      vehicleId,
      fuelCost,
      maintenanceCost,
      totalCost: fuelCost + maintenanceCost,
    });
  } catch (err) {
    console.error('getVehicleTotalCost error:', err);
    return res.status(500).json({ error: 'Failed to compute total cost' });
  }
}

async function getFuelEfficiencyReport(req, res) {
  try {
    return res.json(await computeFuelEfficiency());
  } catch (err) {
    console.error('getFuelEfficiencyReport error:', err);
    return res.status(500).json({ error: 'Failed to compute fuel efficiency report' });
  }
}

async function getFleetUtilizationReport(req, res) {
  try {
    return res.json(await computeFleetUtilization());
  } catch (err) {
    console.error('getFleetUtilizationReport error:', err);
    return res.status(500).json({ error: 'Failed to compute fleet utilization report' });
  }
}

async function getOperationalCostReport(req, res) {
  try {
    return res.json(await computeOperationalCost());
  } catch (err) {
    console.error('getOperationalCostReport error:', err);
    return res.status(500).json({ error: 'Failed to compute operational cost report' });
  }
}

async function getRoiReport(req, res) {
  try {
    return res.json(await computeRoi());
  } catch (err) {
    console.error('getRoiReport error:', err);
    return res.status(500).json({ error: 'Failed to compute ROI report' });
  }
}

/* ------------------------------------------------------------------ */
/* CSV export — simple string-join, no library                       */
/* ------------------------------------------------------------------ */

function toCsv(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

async function exportCsv(req, res) {
  try {
    const { type } = req.query;
    let csv;
    let filename;

    switch (type) {
      case 'fuel-efficiency': {
        const data = await computeFuelEfficiency();
        csv = toCsv(data, [
          { key: 'vehicleId', label: 'Vehicle ID' },
          { key: 'vehicleName', label: 'Vehicle Name' },
          { key: 'registrationNumber', label: 'Registration' },
          { key: 'totalDistance', label: 'Total Distance (km)' },
          { key: 'totalFuel', label: 'Total Fuel (L)' },
          { key: 'efficiencyKmPerLiter', label: 'Efficiency (km/L)' },
        ]);
        filename = 'fuel-efficiency.csv';
        break;
      }
      case 'utilization': {
        const data = await computeFleetUtilization();
        csv = toCsv(data.perVehicle, [
          { key: 'vehicleId', label: 'Vehicle ID' },
          { key: 'vehicleName', label: 'Vehicle Name' },
          { key: 'registrationNumber', label: 'Registration' },
          { key: 'status', label: 'Status' },
          { key: 'daysOnTrip', label: 'Days On Trip' },
        ]);
        filename = 'fleet-utilization.csv';
        break;
      }
      case 'cost': {
        const data = await computeOperationalCost();
        csv = toCsv(data, [
          { key: 'vehicleId', label: 'Vehicle ID' },
          { key: 'vehicleName', label: 'Vehicle Name' },
          { key: 'registrationNumber', label: 'Registration' },
          { key: 'fuelCost', label: 'Fuel Cost' },
          { key: 'maintenanceCost', label: 'Maintenance Cost' },
          { key: 'expenseCost', label: 'Expense Cost' },
          { key: 'totalOperationalCost', label: 'Total Operational Cost' },
        ]);
        filename = 'operational-cost.csv';
        break;
      }
      case 'roi': {
        const data = await computeRoi();
        csv = toCsv(data, [
          { key: 'vehicleId', label: 'Vehicle ID' },
          { key: 'vehicleName', label: 'Vehicle Name' },
          { key: 'registrationNumber', label: 'Registration' },
          { key: 'acquisitionCost', label: 'Acquisition Cost' },
          { key: 'fuelCost', label: 'Fuel Cost' },
          { key: 'maintenanceCost', label: 'Maintenance Cost' },
          { key: 'revenue', label: 'Revenue' },
          { key: 'roi', label: 'ROI' },
          { key: 'note', label: 'Note' },
        ]);
        filename = 'roi.csv';
        break;
      }
      default:
        return res.status(400).json({
          error: 'type must be one of: fuel-efficiency, utilization, cost, roi',
        });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    console.error('exportCsv error:', err);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
}

module.exports = {
  getVehicleTotalCost,
  getFuelEfficiencyReport,
  getFleetUtilizationReport,
  getOperationalCostReport,
  getRoiReport,
  exportCsv,
};