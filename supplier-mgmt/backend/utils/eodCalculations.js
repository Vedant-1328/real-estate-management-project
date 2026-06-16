/** EOD row linked to an outside-hire assignment stub. */
export const isOutsideEodEntry = (entry) =>
  Boolean(entry?.assignment?.outsideDriverName);

/** Customer billing: quantity (trips or hours) × rate (+ extras − deductions). */
export const calculateEodTotal = ({
  actualTrips = 0,
  ratePerTrip = 0,
  extraCharges = 0,
  deductions = 0,
}) => {
  const quantity = Number(actualTrips) || 0;
  const rate = Number(ratePerTrip) || 0;
  const extra = Number(extraCharges) || 0;
  const ded = Number(deductions) || 0;
  return quantity * rate + extra - ded;
};
