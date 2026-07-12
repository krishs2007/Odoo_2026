const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/fuel  { vehicleId, liters, cost, date }
async function createFuelLog(req, res) {
  try {
    const { vehicleId, liters, cost, date } = req.body;

    if (!vehicleId || liters == null || cost == null) {
      return res.status(400).json({ error: 'vehicleId, liters, and cost are required' });
    }
    if (Number(liters) <= 0 || Number(cost) < 0) {
      return res.status(400).json({ error: 'liters must be > 0 and cost must be >= 0' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const fuelLog = await prisma.fuelLog.create({
      data: {
        vehicleId: Number(vehicleId),
        liters: Number(liters),
        cost: Number(cost),
        ...(date ? { date: new Date(date) } : {}),
      },
    });

    return res.status(201).json(fuelLog);
  } catch (err) {
    console.error('createFuelLog error:', err);
    return res.status(500).json({ error: 'Failed to create fuel log' });
  }
}

// GET /api/fuel?vehicleId=
async function getFuelLogs(req, res) {
  try {
    const { vehicleId } = req.query;
    const where = vehicleId ? { vehicleId: Number(vehicleId) } : {};

    const fuelLogs = await prisma.fuelLog.findMany({
      where,
      include: { vehicle: { select: { id: true, name: true, registrationNumber: true } } },
      orderBy: { date: 'desc' },
    });

    return res.json(fuelLogs);
  } catch (err) {
    console.error('getFuelLogs error:', err);
    return res.status(500).json({ error: 'Failed to fetch fuel logs' });
  }
}

module.exports = { createFuelLog, getFuelLogs };