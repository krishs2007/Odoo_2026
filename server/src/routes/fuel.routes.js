const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { createFuelLog, getFuelLogs } = require('../controllers/fuel.controller');

const allowed = requireRole('FleetManager', 'FinancialAnalyst');

router.post('/', verifyToken, allowed, createFuelLog);
router.get('/', verifyToken, allowed, getFuelLogs);

module.exports = router;