/**
 * Deletes all driver advance records (includes salary deduction / processing state).
 * Run: node scripts/clear-driver-advances.js
 */
import sequelize from '../config/db.js';

const [countRows] = await sequelize.query(
  'SELECT COUNT(*) AS cnt FROM driver_advances'
);
const before = Number(countRows[0]?.cnt ?? countRows[0]?.CNT ?? 0);

await sequelize.query('DELETE FROM driver_advances');
await sequelize.query('ALTER TABLE driver_advances AUTO_INCREMENT = 1');

const [auditResult] = await sequelize.query(
  "DELETE FROM audit_logs WHERE module = 'driver_advances'"
);

console.log(`Deleted ${before} driver advance record(s).`);
console.log(`Removed ${auditResult.affectedRows ?? 0} related audit log(s).`);
console.log('Driver advances and salary processing history cleared.');

await sequelize.close();
