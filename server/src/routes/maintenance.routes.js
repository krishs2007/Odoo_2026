const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/auth");
const {
  createMaintenance,
  listMaintenance,
  closeMaintenance,
} = require("../controllers/maintenance.controller");

// Mutations restricted to FleetManager only
router.get("/", verifyToken, listMaintenance);
router.post("/", verifyToken, requireRole("FleetManager"), createMaintenance);
router.patch(
  "/:id/close",
  verifyToken,
  requireRole("FleetManager"),
  closeMaintenance,
);

module.exports = router;
