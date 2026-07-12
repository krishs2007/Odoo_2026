const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * POST /api/maintenance
 * body: { vehicleId, description, cost }
 * Creates an ACTIVE maintenance record and sets Vehicle.status = IN_SHOP.
 * Single transaction.
 */
async function createMaintenance(req, res) {
  const { vehicleId, description, cost } = req.body;

  if (!vehicleId || !description || cost == null) {
    return res
      .status(400)
      .json({ error: "vehicleId, description, and cost are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id: Number(vehicleId) },
      });
      if (!vehicle) {
        throw { status: 404, message: "Vehicle not found" };
      }
      if (vehicle.status === "RETIRED") {
        throw {
          status: 400,
          message: "Cannot open a maintenance record for a retired vehicle",
        };
      }
      if (vehicle.status === "ON_TRIP") {
        throw {
          status: 400,
          message:
            "Cannot open a maintenance record while the vehicle is on a trip",
        };
      }

      const log = await tx.maintenanceLog.create({
        data: {
          vehicleId: Number(vehicleId),
          description,
          cost: Number(cost),
          status: "ACTIVE",
        },
      });

      await tx.vehicle.update({
        where: { id: Number(vehicleId) },
        data: { status: "IN_SHOP" },
      });

      return log;
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("createMaintenance error:", err);
    return res
      .status(500)
      .json({ error: "Failed to create maintenance record" });
  }
}

/**
 * GET /api/maintenance?vehicleId=&status=
 */
async function listMaintenance(req, res) {
  try {
    const { vehicleId, status } = req.query;
    const where = {};
    if (vehicleId) where.vehicleId = Number(vehicleId);
    if (status) where.status = status;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(logs);
  } catch (err) {
    console.error("listMaintenance error:", err);
    return res
      .status(500)
      .json({ error: "Failed to list maintenance records" });
  }
}

/**
 * PATCH /api/maintenance/:id/close
 * Sets MaintenanceLog.status = CLOSED, closedAt = now().
 * Restores Vehicle.status = AVAILABLE — unless the vehicle is RETIRED, in which case leave it retired.
 */
async function closeMaintenance(req, res) {
  const logId = Number(req.params.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.findUnique({ where: { id: logId } });
      if (!log) {
        throw { status: 404, message: "Maintenance record not found" };
      }
      if (log.status !== "ACTIVE") {
        throw {
          status: 400,
          message: `Maintenance record is already ${log.status}`,
        };
      }

      const updatedLog = await tx.maintenanceLog.update({
        where: { id: logId },
        data: { status: "CLOSED", closedAt: new Date() },
      });

      const vehicle = await tx.vehicle.findUnique({
        where: { id: log.vehicleId },
      });
      if (vehicle && vehicle.status !== "RETIRED") {
        await tx.vehicle.update({
          where: { id: log.vehicleId },
          data: { status: "AVAILABLE" },
        });
      }

      return updatedLog;
    });

    return res.json(result);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("closeMaintenance error:", err);
    return res
      .status(500)
      .json({ error: "Failed to close maintenance record" });
  }
}

module.exports = { createMaintenance, listMaintenance, closeMaintenance };
