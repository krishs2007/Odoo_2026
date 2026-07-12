const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_TYPES = ['toll', 'other'];

// POST /api/expense  { vehicleId, type, amount, date }
async function createExpense(req, res) {
  try {
    const { vehicleId, type, amount, date } = req.body;

    if (!vehicleId || !type || amount == null) {
      return res.status(400).json({ error: 'vehicleId, type, and amount are required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (Number(amount) < 0) {
      return res.status(400).json({ error: 'amount must be >= 0' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const expense = await prisma.expense.create({
      data: {
        vehicleId: Number(vehicleId),
        type,
        amount: Number(amount),
        ...(date ? { date: new Date(date) } : {}),
      },
    });

    return res.status(201).json(expense);
  } catch (err) {
    console.error('createExpense error:', err);
    return res.status(500).json({ error: 'Failed to create expense' });
  }
}

// GET /api/expense?vehicleId=
async function getExpenses(req, res) {
  try {
    const { vehicleId } = req.query;
    const where = vehicleId ? { vehicleId: Number(vehicleId) } : {};

    const expenses = await prisma.expense.findMany({
      where,
      include: { vehicle: { select: { id: true, name: true, registrationNumber: true } } },
      orderBy: { date: 'desc' },
    });

    return res.json(expenses);
  } catch (err) {
    console.error('getExpenses error:', err);
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
}

module.exports = { createExpense, getExpenses };