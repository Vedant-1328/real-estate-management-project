/** Sum a numeric field on Sequelize instances (values decrypted by afterFind hooks). */
export const sumInstances = (instances, field) =>
  instances.reduce((total, row) => total + Number(row.getDataValue(field) ?? 0), 0);

/** Group-sum instances by a key field. Returns { [groupId]: sum }. */
export const groupSumInstances = (instances, groupField, sumField) => {
  const map = {};
  for (const row of instances) {
    const key = row.getDataValue(groupField);
    if (key == null) continue;
    map[key] = (map[key] || 0) + Number(row.getDataValue(sumField) ?? 0);
  }
  return map;
};

/** Count instances per group key. */
export const groupCountInstances = (instances, groupField) => {
  const map = {};
  for (const row of instances) {
    const key = row.getDataValue(groupField);
    if (key == null) continue;
    map[key] = (map[key] || 0) + 1;
  }
  return map;
};

/** Driver report stats from job assignments (encrypted fields decrypted via hooks). */
export const aggregateAssignmentsByDriver = (assignments) => {
  const map = {};
  const datesByDriver = {};

  for (const row of assignments) {
    const driverId = row.getDataValue('driverId');
    if (driverId == null) continue;

    if (!map[driverId]) {
      map[driverId] = { totalJobs: 0, assignedDays: 0, outsidePaymentsOnAssignment: 0 };
    }
    map[driverId].totalJobs += 1;

    const dateKey = row.getDataValue('assignmentDate');
    if (dateKey) {
      if (!datesByDriver[driverId]) datesByDriver[driverId] = new Set();
      datesByDriver[driverId].add(dateKey);
    }

    const outsideName = row.getDataValue('outsideDriverName');
    if (outsideName) {
      map[driverId].outsidePaymentsOnAssignment += Number(row.getDataValue('driverCost') ?? 0);
    }
  }

  for (const driverId of Object.keys(map)) {
    map[driverId].assignedDays = datesByDriver[driverId]?.size ?? 0;
  }

  return map;
};

export const sumUnassignedOutsideDriverCost = (assignments) =>
  assignments.reduce((total, row) => {
    if (row.getDataValue('driverId') != null) return total;
    if (!row.getDataValue('outsideDriverName')) return total;
    return total + Number(row.getDataValue('driverCost') ?? 0);
  }, 0);

export const sortInvoiceItemsByDate = (items) =>
  [...items].sort((a, b) => {
    const da = a.lineDate || a.getDataValue?.('lineDate') || '';
    const db = b.lineDate || b.getDataValue?.('lineDate') || '';
    return String(da).localeCompare(String(db));
  });
