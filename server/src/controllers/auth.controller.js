// server/src/controllers/auth.controller.js
// Owned by Member 1.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_ROLES = ['FleetManager', 'Driver', 'SafetyOfficer', 'FinancialAnalyst'];

function signToken(user, roleName) {
  // Payload kept intentionally small: { id, role }. `role` is the role NAME
  // (not the numeric roleId) so that requireRole(...) in middleware/auth.js
  // can compare req.user.role directly against allowed role-name lists —
  // every other member's routes already rely on that shape.
  return jwt.sign({ id: user.id, role: roleName }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  });
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
  };
}

// POST /api/auth/register  { name, email, password, role }
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    const roleRow = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRow) {
      return res.status(400).json({ error: `Role "${role}" has not been seeded yet` });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, roleId: roleRow.id },
      include: { role: true },
    });

    const token = signToken(user, roleRow.name);
    return res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    console.error('register error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
}

// POST /api/auth/login  { email, password }
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user, user.role.name);
    return res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Failed to log in' });
  }
}

// GET /api/auth/me  (protected by verifyToken — req.user = { id, role })
async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(toPublicUser(user));
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Failed to fetch current user' });
  }
}

module.exports = { register, login, me, VALID_ROLES };
