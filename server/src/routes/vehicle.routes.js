// server/src/routes/vehicle.routes.js
// Owned by Member 2. Auto-mounted by Member 1's routes loader — do not register this
// manually in index.js.
//
// ASSUMPTION (verify against Member 1's actual middleware/auth.js once scaffold is pulled):
// module.exports = { verifyToken, requireRole } where requireRole(...roles) returns a
// middleware checking req.user.role.name against the allowed list.

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicle.controller');

// All vehicle routes require a valid token.
router.use(verifyToken);

router.get('/', listVehicles);
router.get('/:id', getVehicle);

// Mutations restricted to FleetManager per MEMBER_2_TASKS.md
router.post('/', requireRole('FleetManager'), createVehicle);
router.put('/:id', requireRole('FleetManager'), updateVehicle);
router.delete('/:id', requireRole('FleetManager'), deleteVehicle);

module.exports = router;