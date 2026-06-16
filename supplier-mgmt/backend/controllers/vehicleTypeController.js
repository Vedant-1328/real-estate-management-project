import { Vehicle, VehicleType } from '../models/index.js';
import { hardDestroy } from '../utils/hardDestroy.js';

export const listVehicleTypes = async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status && status !== 'all') where.status = status;

  const rows = await VehicleType.findAll({ where, order: [['name', 'ASC']] });
  res.json({ success: true, data: rows });
};

export const createVehicleType = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const existing = await VehicleType.findOne({ where: { name } });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Vehicle type name already exists' });
  }

  const row = await VehicleType.create({
    name,
    description: req.body.description || null,
    billingUnit: req.body.billingUnit || 'trip',
    showsCapacity: Boolean(req.body.showsCapacity),
    status: req.body.status || 'active',
  });
  res.status(201).json({ success: true, data: row });
};

export const updateVehicleType = async (req, res) => {
  const row = await VehicleType.findByPk(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, message: 'Vehicle type not found' });
  }

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const dup = await VehicleType.findOne({
      where: { name },
    });
    if (dup && dup.id !== row.id) {
      return res.status(400).json({ success: false, message: 'Vehicle type name already exists' });
    }
    row.name = name;
  }

  if (req.body.showsCapacity !== undefined) {
    row.showsCapacity = Boolean(req.body.showsCapacity);
  }

  ['description', 'billingUnit', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) {
      row[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await row.save();

  if (req.body.name !== undefined) {
    await Vehicle.update({ vehicleType: row.name }, { where: { vehicleTypeId: row.id } });
  }

  res.json({ success: true, data: row });
};

export const deleteVehicleType = async (req, res) => {
  const row = await VehicleType.findByPk(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, message: 'Vehicle type not found' });
  }

  const inUse = await Vehicle.count({ where: { vehicleTypeId: row.id } });
  if (inUse > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete — ${inUse} vehicle(s) use this type. Reassign them first.`,
    });
  }

  await hardDestroy(row);
  res.json({ success: true, message: 'Vehicle type deleted' });
};
