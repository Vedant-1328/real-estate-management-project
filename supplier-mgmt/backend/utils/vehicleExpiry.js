const EXPIRY_FIELDS = [
  { type: 'Insurance', field: 'insuranceExpiry' },
  { type: 'Fitness Certificate', field: 'fitnessExpiry' },
  { type: 'Permit', field: 'permitExpiry' },
  { type: 'Pollution Certificate', field: 'pollutionExpiry' },
];

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const toDateOnly = (d) => d.toISOString().slice(0, 10);

export const getExpiryAlerts = (vehicle) => {
  const today = toDateOnly(new Date());
  const threshold = toDateOnly(addDays(new Date(), 30));

  return EXPIRY_FIELDS.filter(({ field }) => {
    const expiry = vehicle[field];
    if (!expiry) return false;
    const expiryStr = typeof expiry === 'string' ? expiry.slice(0, 10) : toDateOnly(expiry);
    return expiryStr <= threshold;
  }).map(({ type, field }) => ({
    type,
    expiryDate: vehicle[field],
  }));
};

export const attachExpiryAlerts = (vehicle) => {
  const plain = vehicle.get ? vehicle.get({ plain: true }) : { ...vehicle };
  plain.expiryAlerts = getExpiryAlerts(plain);
  return plain;
};
