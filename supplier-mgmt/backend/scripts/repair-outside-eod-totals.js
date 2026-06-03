/**
 * Recalculates billing total_amount for outside-driver EOD rows (trips × company rate).
 * Run: node scripts/repair-outside-eod-totals.js
 */
import { Op } from 'sequelize';
import { EodEntry, JobAssignment } from '../models/index.js';
import { calculateEodTotal } from '../utils/eodCalculations.js';

const rows = await EodEntry.findAll({
  include: [
    {
      model: JobAssignment,
      as: 'assignment',
      attributes: ['outsideDriverName'],
      required: true,
      where: { outsideDriverName: { [Op.ne]: null } },
    },
  ],
});

let fixed = 0;
for (const entry of rows) {
  const plain = entry.get({ plain: true });
  const next = calculateEodTotal({
    actualTrips: plain.actualTrips,
    ratePerTrip: plain.ratePerTrip ?? 0,
    extraCharges: plain.extraCharges ?? 0,
    deductions: plain.deductions ?? 0,
  });
  if (Number(entry.totalAmount) !== next) {
    entry.totalAmount = next;
    await entry.save();
    fixed += 1;
  }
}

console.log(`Repaired ${fixed} outside-driver EOD billing total(s) (${rows.length} checked).`);
process.exit(0);
