import { Op } from 'sequelize';
import { JobAssignment } from '../models/index.js';

const TERMINAL_STATUSES = ['completed', 'cancelled'];

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
