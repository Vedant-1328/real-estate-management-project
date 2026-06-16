import { Op } from 'sequelize';
import { CompanyJobRate, JobType } from '../models/index.js';
import { getPreferredRateType } from './eodBilling.js';

/**
 * Returns the applicable rate for a job assignment:
 * most recent effectiveFrom <= asOfDate matching company, job type, and optional vehicle type.
 */
export const getEffectiveRate = async ({
  companyId,
  jobTypeId,
  vehicleType = null,
  rateType = null,
  asOfDate = new Date().toISOString().slice(0, 10),
}) => {
  const where = {
    companyId,
    jobTypeId,
    effectiveFrom: { [Op.lte]: asOfDate },
    [Op.or]: [
      { effectiveTo: null },
      { effectiveTo: { [Op.gte]: asOfDate } },
    ],
  };

  if (vehicleType) {
    where.vehicleType = vehicleType;
  }
  if (rateType) {
    where.rateType = rateType;
  }

  const rate = await CompanyJobRate.findOne({
    where,
    include: [{ model: JobType, as: 'jobType', attributes: ['id', 'name'] }],
    order: [['effectiveFrom', 'DESC']],
  });

  return rate;
};

export const RATE_TYPE_LABELS = {
  per_trip: 'Per Trip',
  per_day: 'Per Day',
  per_hour: 'Per Hour',
  fixed: 'Fixed',
  per_ton: 'Per Ton',
};

export const formatRate = (rate) => {
  if (!rate) return null;
  const plain = rate.get ? rate.get({ plain: true }) : rate;
  return {
    ...plain,
    rateAmount: Number(plain.rateAmount),
    rateTypeLabel: RATE_TYPE_LABELS[plain.rateType] || plain.rateType,
  };
};

/** Resolve company rate for EOD billing (per-hour for JCB, else best match). */
export const resolveEodBillingRate = async ({
  companyId,
  jobTypeId,
  vehicleType = null,
  vehicleTypeBillingUnit = null,
  quantityUnit = null,
  asOfDate,
}) => {
  const preferred = getPreferredRateType(vehicleType, vehicleTypeBillingUnit, quantityUnit);

  let rate = await getEffectiveRate({
    companyId,
    jobTypeId,
    vehicleType,
    rateType: preferred,
    asOfDate,
  });
  if (!rate && preferred) {
    rate = await getEffectiveRate({
      companyId,
      jobTypeId,
      vehicleType,
      asOfDate,
    });
  }
  return rate;
};
