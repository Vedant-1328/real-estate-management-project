import { Op } from 'sequelize';
import { Company, Site, TemporarySite } from '../models/index.js';

const SITE_TYPE_LABELS = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  both: 'Both',
  site_by_site: 'Site-by-Site',
};

export const listSites = async (req, res) => {
  const { companyId, siteType, status, search } = req.query;
  const where = {};
  const and = [];

  if (companyId) {
    and.push({ [Op.or]: [{ companyId }, { companyId: null }] });
  }
  if (siteType && siteType !== 'all') where.siteType = siteType;
  if (status && status !== 'all') where.status = status;
  if (search) {
    and.push({
      [Op.or]: [
        { siteName: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
      ],
    });
  }
  if (and.length) where[Op.and] = and;

  const sites = await Site.findAll({
    where,
    include: [{ model: Company, as: 'company', attributes: ['id', 'companyName'] }],
    order: [['siteName', 'ASC']],
  });

  res.json({
    success: true,
    data: sites.map((s) => {
      const plain = s.get({ plain: true });
      return {
        ...plain,
        siteTypeLabel: SITE_TYPE_LABELS[plain.siteType] || plain.siteType,
      };
    }),
  });
};

export const createSite = async (req, res) => {
  const companyId = req.body.companyId || null;
  if (companyId) {
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(400).json({ success: false, message: 'Invalid company' });
    }
  }

  const site = await Site.create({
    siteName: req.body.siteName,
    companyId,
    address: req.body.address,
    city: req.body.city,
    contactPerson: req.body.contactPerson || null,
    mobile: req.body.mobile || null,
    siteType: req.body.siteType || 'both',
    status: req.body.status || 'active',
    notes: req.body.notes || null,
  });

  const withCompany = await Site.findByPk(site.id, {
    include: [{ model: Company, as: 'company', attributes: ['id', 'companyName'] }],
  });

  res.status(201).json({ success: true, data: withCompany });
};

export const updateSite = async (req, res) => {
  const site = await Site.findByPk(req.params.id);
  if (!site) {
    return res.status(404).json({ success: false, message: 'Site not found' });
  }

  if (req.body.companyId) {
    const company = await Company.findByPk(req.body.companyId);
    if (!company) {
      return res.status(400).json({ success: false, message: 'Invalid company' });
    }
  }

  const fields = [
    'siteName',
    'companyId',
    'address',
    'city',
    'contactPerson',
    'mobile',
    'siteType',
    'status',
    'notes',
  ];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      site[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await site.save();

  const withCompany = await Site.findByPk(site.id, {
    include: [{ model: Company, as: 'company', attributes: ['id', 'companyName'] }],
  });

  res.json({ success: true, data: withCompany });
};

export const deleteSite = async (req, res) => {
  const site = await Site.findByPk(req.params.id);
  if (!site) {
    return res.status(404).json({ success: false, message: 'Site not found' });
  }
  await site.destroy();
  res.json({ success: true, message: 'Site deleted' });
};

export const listTemporarySites = async (_req, res) => {
  const sites = await TemporarySite.findAll({
    where: { convertedToSiteId: null },
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: sites });
};

export const convertTemporarySite = async (req, res) => {
  const temp = await TemporarySite.findByPk(req.params.id);
  if (!temp) {
    return res.status(404).json({ success: false, message: 'Temporary site not found' });
  }
  if (temp.convertedToSiteId) {
    return res.status(400).json({ success: false, message: 'Already converted' });
  }

  const {
    companyId,
    city,
    siteType = 'both',
    status = 'active',
    notes,
  } = req.body;

  if (!companyId) {
    return res.status(400).json({ success: false, message: 'Company is required to convert' });
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    return res.status(400).json({ success: false, message: 'Invalid company' });
  }

  const site = await Site.create({
    siteName: req.body.siteName || temp.siteName,
    companyId,
    address: req.body.address || temp.address,
    city: city || 'Unknown',
    contactPerson: req.body.contactPerson || temp.contactPerson,
    mobile: req.body.mobile || temp.mobile,
    siteType,
    status,
    notes: notes || temp.reason || null,
  });

  temp.convertedToSiteId = site.id;
  await temp.save();

  const withCompany = await Site.findByPk(site.id, {
    include: [{ model: Company, as: 'company', attributes: ['id', 'companyName'] }],
  });

  res.json({
    success: true,
    message: 'Site converted to master',
    data: { site: withCompany, temporarySite: temp },
  });
};
