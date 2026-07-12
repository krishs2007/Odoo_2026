// server/src/routes/driver.routes.js
// Owned by Member 2. Auto-mounted by the routes loader at /api/driver.

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
} = require('../controllers/driver.controller');

// All driver routes require a valid token.
router.use(verifyToken);

router.get('/', listDrivers);
router.get('/:id', getDriver);

// Mutations restricted to FleetManager, SafetyOfficer per MEMBER_2_TASKS.md
router.post('/', requireRole('FleetManager', 'SafetyOfficer'), createDriver);
router.put('/:id', requireRole('FleetManager', 'SafetyOfficer'), updateDriver);
router.delete('/:id', requireRole('FleetManager', 'SafetyOfficer'), deleteDriver);

module.exports = router;
