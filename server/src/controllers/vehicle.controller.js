// server/src/controllers/vehicle.controller.js
// Owned by Member 2. Do not edit schema.prisma from here — read-only usage via Prisma Client.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function validateVehiclePayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ['registrationNumber', 'name', 'type', 'maxLoadCapacity', 'acquisitionCost'];

  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push(`${field} is required`);
      }
    }
  }

  if (body.maxLoadCapacity !== undefined && Number(body.maxLoadCapacity) < 0) {
    errors.push('maxLoadCapacity must be >= 0');
  }
  if (body.acquisitionCost !== undefined && Number(body.acquisitionCost) < 0) {
    errors.push('acquisitionCost must be >= 0');
  }
  if (body.odometer !== undefined && Number(body.odometer) < 0) {
    errors.push('odometer must be >= 0');
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

// GET /api/vehicle?type=&status=&region=
async function listVehicles(req, res) {
  try {
    const { type, status, region } = req.query;
    const where = {};
    if (type) where.type = type;
    if (region) where.region = region;
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      where.status = status;
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(vehicles);
  } catch (err) {
    console.error('listVehicles error:', err);
    return res.status(500).json({ error: 'Failed to list vehicles' });
  }
}

// GET /api/vehicle/:id
async function getVehicle(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid vehicle id' });

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    return res.json(vehicle);
  } catch (err) {
    console.error('getVehicle error:', err);
    return res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
}

// POST /api/vehicle
async function createVehicle(req, res) {
  try {
    const errors = validateVehiclePayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const {
      registrationNumber,
      name,
      type,
      maxLoadCapacity,
      odometer,
      acquisitionCost,
      status,
      region,
    } = req.body;

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber,
        name,
        type,
        maxLoadCapacity: Number(maxLoadCapacity),
        odometer: toNumberOrNull(odometer) ?? 0,
        acquisitionCost: Number(acquisitionCost),
        status: status || 'AVAILABLE',
        region: region || null,
      },
    });
    return res.status(201).json(vehicle);
  } catch (err) {
    // Unique constraint violation on registrationNumber
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A vehicle with this registration number already exists' });
    }
    console.error('createVehicle error:', err);
    return res.status(500).json({ error: 'Failed to create vehicle' });
  }
}

// PUT /api/vehicle/:id
async function updateVehicle(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid vehicle id' });

    const errors = validateVehiclePayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const {
      registrationNumber,
      name,
      type,
      maxLoadCapacity,
      odometer,
      acquisitionCost,
      status,
      region,
    } = req.body;

    const data = {};
    if (registrationNumber !== undefined) data.registrationNumber = registrationNumber;
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (maxLoadCapacity !== undefined) data.maxLoadCapacity = Number(maxLoadCapacity);
    if (odometer !== undefined) data.odometer = Number(odometer);
    if (acquisitionCost !== undefined) data.acquisitionCost = Number(acquisitionCost);
    if (status !== undefined) data.status = status;
    if (region !== undefined) data.region = region;

    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    return res.json(vehicle);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A vehicle with this registration number already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    console.error('updateVehicle error:', err);
    return res.status(500).json({ error: 'Failed to update vehicle' });
  }
}

// DELETE /api/vehicle/:id
// Soft delete: sets status to RETIRED rather than removing the row, so cost/ROI
// history (trips, maintenance, fuel, expenses) stays intact per team plan Section 3.3.
async function deleteVehicle(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid vehicle id' });

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { status: 'RETIRED' },
    });
    return res.json({ message: 'Vehicle retired', vehicle });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    console.error('deleteVehicle error:', err);
    return res.status(500).json({ error: 'Failed to retire vehicle' });
  }
}

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};