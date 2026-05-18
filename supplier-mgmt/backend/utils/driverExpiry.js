const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const toDateOnly = (d) => d.toISOString().slice(0, 10);

export const isLicenseExpiringSoon = (licenseExpiry, withinDays = 30) => {
  if (!licenseExpiry) return false;
  const threshold = toDateOnly(addDays(new Date(), withinDays));
  const expiryStr =
    typeof licenseExpiry === 'string' ? licenseExpiry.slice(0, 10) : toDateOnly(licenseExpiry);
  return expiryStr <= threshold;
};

export const formatDriver = (driver) => {
  const plain = driver.get ? driver.get({ plain: true }) : { ...driver };
  plain.licenseExpiringSoon = isLicenseExpiringSoon(plain.licenseExpiry);
  if (plain.grossSalary != null) {
    plain.grossSalary = Number(plain.grossSalary);
  }
  return plain;
};
