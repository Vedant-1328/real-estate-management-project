/** Legacy fallback when vehicle type is free text (pre-master). */
export const isJcbVehicleType = (vehicleType) =>
  Boolean(vehicleType && String(vehicleType).trim().toLowerCase().includes('jcb'));

/**
 * EOD display/calc unit: `hours` or `trips`.
 * @param {string|null} vehicleTypeName
 * @param {'trip'|'hour'|'both'|null} masterBillingUnit - vehicle_types.billing_unit
 * @param {'trip'|'hour'|null} entryQuantityUnit - eod_entries.quantity_unit
 */
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

export const vehicleTypeUsesBothBilling = (masterBillingUnit) => masterBillingUnit === 'both';

/** Company rate card rate_type to prefer for this vehicle / entry. */
export const getPreferredRateType = (
  vehicleTypeName,
  masterBillingUnit = null,
  entryQuantityUnit = null
) => {
  if (entryQuantityUnit === 'hour') return 'per_hour';
  if (entryQuantityUnit === 'trip') return 'per_trip';
  if (masterBillingUnit === 'hour') return 'per_hour';
  if (masterBillingUnit === 'trip') return 'per_trip';
  if (masterBillingUnit === 'both') return null;
  const unit = getEodBillingUnit(vehicleTypeName, masterBillingUnit, entryQuantityUnit);
  return unit === 'hours' ? 'per_hour' : null;
};

export const quantityLabelForUnit = (billingUnit) =>
  billingUnit === 'hours' ? 'Hours' : 'Trips';

export const rateLabelForUnit = (billingUnit) =>
  billingUnit === 'hours' ? 'Rate per hour' : 'Rate per trip';
