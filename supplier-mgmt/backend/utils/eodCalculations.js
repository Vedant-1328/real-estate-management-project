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
