const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getVehicleTotalCost,
  getFuelEfficiencyReport,
  getFleetUtilizationReport,
  getOperationalCostReport,
  getRoiReport,
  exportCsv,
} = require('../controllers/reports.controller');

const allowed = requireRole('FinancialAnalyst', 'FleetManager');

// Per-vehicle total cost — lives here per MEMBER_4_TASKS.md even though the data
// isn't report-shaped. NOTE: because the routes loader auto-mounts this whole file
// at /reports (from the filename reports.routes.js), this endpoint actually resolves
// to /api/reports/vehicle/:id/total-cost, not /api/vehicle/:id/total-cost. The
// frontend (client/src/api/reports.js) calls the real path.
router.get('/vehicle/:id/total-cost', verifyToken, allowed, getVehicleTotalCost);

router.get('/fuel-efficiency', verifyToken, allowed, getFuelEfficiencyReport);
router.get('/fleet-utilization', verifyToken, allowed, getFleetUtilizationReport);
router.get('/operational-cost', verifyToken, allowed, getOperationalCostReport);
router.get('/roi', verifyToken, allowed, getRoiReport);
router.get('/export/csv', verifyToken, allowed, exportCsv);

module.exports = router;