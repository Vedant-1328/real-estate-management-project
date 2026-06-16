/** Vehicle types that can appear in EOD "Loaded by" (JCB / Hitachi loaders). */
const LOADER_NAMES = new Set(['jcb', 'hitachi']);

export const vehicleTypeDisplayName = (vehicle) =>
  (vehicle?.vehicleTypeRef?.name ?? vehicle?.vehicleType ?? '').trim();

export const isLoaderVehicleTypeName = (name) =>
  LOADER_NAMES.has(String(name).trim().toLowerCase());

export const isLoaderVehicle = (vehicle) =>
  isLoaderVehicleTypeName(vehicleTypeDisplayName(vehicle));
