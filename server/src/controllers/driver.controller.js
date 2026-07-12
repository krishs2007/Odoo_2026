
// server/src/controllers/driver.controller.js
// Owned by Member 2.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];

function validateDriverPayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ['name', 'licenseNumber', 'licenseCategory', 'licenseExpiryDate', 'contactNumber'];

  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push(`${field} is required`);
      }
    }
  }

  if (body.licenseExpiryDate !== undefined && Number.isNaN(Date.parse(body.licenseExpiryDate))) {
    errors.push('licenseExpiryDate must be a valid date');
  }
  if (body.safetyScore !== undefined && Number(body.safetyScore) < 0) {
    errors.push('safetyScore must be >= 0');
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

// GET /api/driver?status=
// Note: for status=AVAILABLE, we additionally exclude drivers whose license has
// expired, per MEMBER_2_TASKS.md ("your endpoint should still support this filter").
// Member 3 does the authoritative re-check server-side at dispatch time.
async function listDrivers(req, res) {
  try {
    const { status } = req.query;
    const where = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      where.status = status;
      if (status === 'AVAILABLE') {
        where.licenseExpiryDate = { gt: new Date() };
      }
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(drivers);
  } catch (err) {
    console.error('listDrivers error:', err);
    return res.status(500).json({ error: 'Failed to list drivers' });
  }
}

// GET /api/driver/:id
async function getDriver(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid driver id' });

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    return res.json(driver);
  } catch (err) {
    console.error('getDriver error:', err);
    return res.status(500).json({ error: 'Failed to fetch driver' });
  }
}

// POST /api/driver
async function createDriver(req, res) {
  try {
    const errors = validateDriverPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const {
      name,
      licenseNumber,
      licenseCategory,
      licenseExpiryDate,
      contactNumber,
      safetyScore,
      status,
    } = req.body;

    const driver = await prisma.driver.create({
      data: {
        name,
        licenseNumber,
        licenseCategory,
        licenseExpiryDate: new Date(licenseExpiryDate),
        contactNumber,
        safetyScore: safetyScore !== undefined ? Number(safetyScore) : 100,
        status: status || 'AVAILABLE',
      },
    });
    return res.status(201).json(driver);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A driver with this license number already exists' });
    }
    console.error('createDriver error:', err);
    return res.status(500).json({ error: 'Failed to create driver' });
  }
}

// PUT /api/driver/:id
async function updateDriver(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid driver id' });

    const errors = validateDriverPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const {
      name,
      licenseNumber,
      licenseCategory,
      licenseExpiryDate,
      contactNumber,
      safetyScore,
      status,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (licenseNumber !== undefined) data.licenseNumber = licenseNumber;
    if (licenseCategory !== undefined) data.licenseCategory = licenseCategory;
    if (licenseExpiryDate !== undefined) data.licenseExpiryDate = new Date(licenseExpiryDate);
    if (contactNumber !== undefined) data.contactNumber = contactNumber;
    if (safetyScore !== undefined) data.safetyScore = Number(safetyScore);
    if (status !== undefined) data.status = status;

    const driver = await prisma.driver.update({ where: { id }, data });
    return res.json(driver);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A driver with this license number already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    console.error('updateDriver error:', err);
    return res.status(500).json({ error: 'Failed to update driver' });
  }
}

// DELETE /api/driver/:id
// Soft delete: sets status to SUSPENDED to preserve trip history, mirroring the
// vehicle RETIRED pattern from MEMBER_2_TASKS.md.
async function deleteDriver(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid driver id' });

    const driver = await prisma.driver.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    return res.json({ message: 'Driver suspended', driver });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    console.error('deleteDriver error:', err);
    return res.status(500).json({ error: 'Failed to suspend driver' });
  }
}

module.exports = {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
};