const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/auth");
const {
  createTrip,
  listTrips,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} = require("../controllers/trip.controller");

// All trip routes require authentication; mutations restricted to Driver/FleetManager
router.get("/", verifyToken, listTrips);
router.post(
  "/",
  verifyToken,
  requireRole("Driver", "FleetManager"),
  createTrip,
);
router.patch(
  "/:id/dispatch",
  verifyToken,
  requireRole("Driver", "FleetManager"),
  dispatchTrip,
);
router.patch(
  "/:id/complete",
  verifyToken,
  requireRole("Driver", "FleetManager"),
  completeTrip,
);
router.patch(
  "/:id/cancel",
  verifyToken,
  requireRole("Driver", "FleetManager"),
  cancelTrip,
);

module.exports = router;
