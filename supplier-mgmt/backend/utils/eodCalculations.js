/** EOD row linked to an outside-hire assignment stub. */
export const isOutsideEodEntry = (entry) =>
  Boolean(entry?.assignment?.outsideDriverName);

/** Customer billing: trips × company rate per trip (+ extras − deductions). */
export const calculateEodTotal = ({
  actualTrips = 0,
  ratePerTrip = 0,
  extraCharges = 0,
  deductions = 0,
}) => {
  const trips = Number(actualTrips) || 0;
  const rate = Number(ratePerTrip) || 0;
  const extra = Number(extraCharges) || 0;
  const ded = Number(deductions) || 0;
  return trips * rate + extra - ded;
};
