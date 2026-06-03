/**
 * One-off: link master sites and EOD rows to a customer company when missing.
 * Run: node scripts/backfill-eod-company-id.js
 */
import '../config/db.js';
import { Company, EodEntry, Site } from '../models/index.js';

const run = async () => {
  const companies = await Company.findAll({
    where: { status: 'active' },
    attributes: ['id'],
  });
  const soleCompanyId = companies.length === 1 ? companies[0].id : null;

  if (soleCompanyId) {
    const [sitesLinked] = await Site.update(
      { companyId: soleCompanyId },
      { where: { companyId: null } }
    );
    console.log(`Linked ${sitesLinked} master site(s) to the only active company (id ${soleCompanyId}).`);
  }

  const rows = await EodEntry.findAll({
    where: { companyId: null },
    attributes: ['id', 'fromSiteId', 'toSiteId'],
  });
  let updated = 0;
  for (const row of rows) {
    let cid = null;
    if (row.fromSiteId) {
      const s = await Site.findByPk(row.fromSiteId, { attributes: ['companyId'] });
      cid = s?.companyId ?? null;
    }
    if (!cid && row.toSiteId) {
      const s = await Site.findByPk(row.toSiteId, { attributes: ['companyId'] });
      cid = s?.companyId ?? null;
    }
    if (!cid && soleCompanyId) cid = soleCompanyId;
    if (cid) {
      row.companyId = cid;
      await row.save();
      updated += 1;
    }
  }
  console.log(`Backfilled company_id on ${updated} of ${rows.length} EOD rows without company.`);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
