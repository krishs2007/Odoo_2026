const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * POST /api/trip
 * Create a trip in DRAFT status.
 * Server-side validation: cargoWeight must not exceed the vehicle's maxLoadCapacity.
 */
async function createTrip(req, res) {
  try {
    const {
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeight,
      plannedDistance,
    } = req.body;

    if (
      !source ||
      !destination ||
      !vehicleId ||
      !driverId ||
      cargoWeight == null ||
      plannedDistance == null
    ) {
      return res
        .status(400)
        .json({
          error:
            "source, destination, vehicleId, driverId, cargoWeight, plannedDistance are all required",
        });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: Number(vehicleId) },
    });
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: Number(driverId) },
    });
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Core validation — never trust the frontend for this
    if (Number(cargoWeight) > vehicle.maxLoadCapacity) {
      return res.status(400).json({
        error: `Cargo weight (${cargoWeight}) exceeds vehicle max load capacity (${vehicle.maxLoadCapacity})`,
      });
    }

    const trip = await prisma.trip.create({
      data: {
        source,
        destination,
        vehicleId: Number(vehicleId),
        driverId: Number(driverId),
        cargoWeight: Number(cargoWeight),
        plannedDistance: Number(plannedDistance),
        status: "DRAFT",
      },
    });

    return res.status(201).json(trip);
  } catch (err) {
    console.error("createTrip error:", err);
    return res.status(500).json({ error: "Failed to create trip" });
  }
}

/**
 * GET /api/trip?status=DRAFT|DISPATCHED|COMPLETED|CANCELLED
 */
async function listTrips(req, res) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            maxLoadCapacity: true,
            status: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            status: true,
            licenseExpiryDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(trips);
  } catch (err) {
    console.error("listTrips error:", err);
    return res.status(500).json({ error: "Failed to list trips" });
  }
}

/**
 * PATCH /api/trip/:id/dispatch
 * DRAFT -> DISPATCHED
 * Re-checks (server-side, always):
 *   1. Vehicle.status === AVAILABLE
 *   2. Driver.status === AVAILABLE
 *   3. Driver.licenseExpiryDate is in the future
 * All state changes happen in a single transaction.
 */
async function dispatchTrip(req, res) {
  const tripId = Number(req.params.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        throw { status: 404, message: "Trip not found" };
      }
      if (trip.status !== "DRAFT") {
        throw {
          status: 400,
          message: `Trip must be in DRAFT status to dispatch (current: ${trip.status})`,
        };
      }

      const vehicle = await tx.vehicle.findUnique({
        where: { id: trip.vehicleId },
      });
      const driver = await tx.driver.findUnique({
        where: { id: trip.driverId },
      });

      if (!vehicle || vehicle.status !== "AVAILABLE") {
        throw {
          status: 400,
          message: `Vehicle is not available (current status: ${vehicle ? vehicle.status : "unknown"})`,
        };
      }
      if (!driver || driver.status !== "AVAILABLE") {
        throw {
          status: 400,
          message: `Driver is not available (current status: ${driver ? driver.status : "unknown"})`,
        };
      }
      if (new Date(driver.licenseExpiryDate) <= new Date()) {
        throw { status: 400, message: "Driver license has expired" };
      }

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: "DISPATCHED", dispatchedAt: new Date() },
      });
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: "ON_TRIP" },
      });
      await tx.driver.update({
        where: { id: driver.id },
        data: { status: "ON_TRIP" },
      });

      return updatedTrip;
    });

    return res.json(result);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("dispatchTrip error:", err);
    return res.status(500).json({ error: "Failed to dispatch trip" });
  }
}

/**
 * PATCH /api/trip/:id/complete
 * body: { finalOdometer, fuelConsumed }
 * DISPATCHED -> COMPLETED
 * Updates Vehicle.odometer, resets Vehicle/Driver to AVAILABLE. Single transaction.
 */
async function completeTrip(req, res) {
  const tripId = Number(req.params.id);
  const { finalOdometer, fuelConsumed } = req.body;

  if (finalOdometer == null || fuelConsumed == null) {
    return res
      .status(400)
      .json({ error: "finalOdometer and fuelConsumed are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        throw { status: 404, message: "Trip not found" };
      }
      if (trip.status !== "DISPATCHED") {
        throw {
          status: 400,
          message: `Trip must be DISPATCHED to complete (current: ${trip.status})`,
        };
      }

      const vehicle = await tx.vehicle.findUnique({
        where: { id: trip.vehicleId },
      });
      if (!vehicle) {
        throw { status: 404, message: "Vehicle not found" };
      }
      if (Number(finalOdometer) < vehicle.odometer) {
        throw {
          status: 400,
          message: `finalOdometer (${finalOdometer}) cannot be less than current vehicle odometer (${vehicle.odometer})`,
        };
      }

      const actualDistance = Number(finalOdometer) - vehicle.odometer;

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualDistance,
          fuelConsumed: Number(fuelConsumed),
        },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { odometer: Number(finalOdometer), status: "AVAILABLE" },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "AVAILABLE" },
      });

      return updatedTrip;
    });

    return res.json(result);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("completeTrip error:", err);
    return res.status(500).json({ error: "Failed to complete trip" });
  }
}

/**
 * PATCH /api/trip/:id/cancel
 * Only valid from DISPATCHED. Restores Vehicle/Driver to AVAILABLE.
 */
async function cancelTrip(req, res) {
  const tripId = Number(req.params.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        throw { status: 404, message: "Trip not found" };
      }
      if (trip.status !== "DISPATCHED") {
        throw {
          status: 400,
          message: `Only DISPATCHED trips can be cancelled (current: ${trip.status})`,
        };
      }

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: "CANCELLED" },
      });
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "AVAILABLE" },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "AVAILABLE" },
      });

      return updatedTrip;
    });

    return res.json(result);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("cancelTrip error:", err);
    return res.status(500).json({ error: "Failed to cancel trip" });
  }
}

module.exports = {
  createTrip,
  listTrips,
  dispatchTrip,
  completeTrip,
  cancelTrip,
};
