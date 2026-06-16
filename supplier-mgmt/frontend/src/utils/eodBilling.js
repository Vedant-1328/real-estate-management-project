export const isJcbVehicleType = (vehicleType) =>
  Boolean(vehicleType && String(vehicleType).trim().toLowerCase().includes('jcb'));

export const vehicleTypeUsesBothBilling = (masterBillingUnit) => masterBillingUnit === 'both';

export const getEodBillingUnit = (
  vehicleTypeName,
  masterBillingUnit = null,
  entryQuantityUnit = null
) => {
  if (entryQuantityUnit === 'hour') return 'hours';
  if (entryQuantityUnit === 'trip') return 'trips';
  if (masterBillingUnit === 'hour') return 'hours';
  if (masterBillingUnit === 'trip') return 'trips';
  if (masterBillingUnit === 'both') return 'trips';
  return isJcbVehicleType(vehicleTypeName) ? 'hours' : 'trips';
};

export const quantityLabelForUnit = (billingUnit) =>
  billingUnit === 'hours' ? 'Hours' : 'Trips';

export const rateLabelForUnit = (billingUnit) =>
  billingUnit === 'hours' ? 'Rate per hour' : 'Rate per trip';

export const formatEodQuantity = (value, billingUnit) => {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const formatted = Number.isInteger(n) ? String(n) : String(n);
  return billingUnit === 'hours' ? `${formatted} hr` : formatted;
};
