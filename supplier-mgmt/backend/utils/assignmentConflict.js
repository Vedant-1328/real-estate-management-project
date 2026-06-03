import { Op } from 'sequelize';
import { JobAssignment } from '../models/index.js';

// Only `cancelled` is treated as terminal here. We deliberately keep
// `completed` in the conflict pool because every EOD now auto-creates a
// `completed` assignment stub — a manual outside-driver job on the same
// vehicle/driver/day should still be flagged as a conflict.
const TERMINAL_STATUSES = ['cancelled'];

export const findAssignmentConflicts = async ({
  assignmentDate,
  vehicleId,
  driverId,
  excludeId = null,
}) => {
  const baseWhere = {
    assignmentDate,
    status: { [Op.notIn]: TERMINAL_STATUSES },
  };

  if (excludeId) {
    baseWhere.id = { [Op.ne]: excludeId };
  }

  let vehicleConflict = null;
  let driverConflict = null;

  if (vehicleId) {
    vehicleConflict = await JobAssignment.findOne({
      where: { ...baseWhere, vehicleId },
      attributes: ['id', 'assignmentDate', 'status'],
    });
  }

  if (driverId) {
    driverConflict = await JobAssignment.findOne({
      where: { ...baseWhere, driverId },
      attributes: ['id', 'assignmentDate', 'status'],
    });
  }

  return { vehicleConflict, driverConflict };
};

export const buildConflictMessage = ({ vehicleConflict, driverConflict }) => {
  if (vehicleConflict && driverConflict) return 'Vehicle/Driver already assigned';
  if (vehicleConflict) return 'Vehicle already assigned';
  if (driverConflict) return 'Driver already assigned';
  return 'Assignment conflict';
};

export const hasConflict = ({ vehicleConflict, driverConflict }) =>
  Boolean(vehicleConflict || driverConflict);
