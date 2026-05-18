import { Op } from 'sequelize';
import { Vehicle, VehicleDocument } from '../models/index.js';
import { toPublicUploadPath } from '../middlewares/vehicleUpload.js';
import { attachExpiryAlerts } from '../utils/vehicleExpiry.js';

const DOC_TYPE_LABELS = {
  rc_book: 'RC Book',
  insurance: 'Insurance',
  permit: 'Permit',
  fitness_certificate: 'Fitness Certificate',
  pollution_certificate: 'Pollution Certificate',
  other: 'Other',
};

const formatDocument = (doc) => {
  const plain = doc.get ? doc.get({ plain: true }) : doc;
  return {
    ...plain,
    docTypeLabel: DOC_TYPE_LABELS[plain.docType] || plain.docType,
    url: plain.filePath,
  };
};

export const listVehicles = async (req, res) => {
  const { status, ownerType, search } = req.query;
  const where = {};

  if (status && status !== 'all') where.status = status;
  if (ownerType && ownerType !== 'all') where.ownerType = ownerType;
  if (search) {
    where.vehicleNumber = { [Op.like]: `%${search}%` };
  }

  const vehicles = await Vehicle.findAll({
    where,
    order: [['vehicleNumber', 'ASC']],
  });

  res.json({
    success: true,
    data: vehicles.map(attachExpiryAlerts),
  });
};

export const createVehicle = async (req, res) => {
  const vehicle = await Vehicle.create({
    vehicleNumber: req.body.vehicleNumber,
    vehicleType: req.body.vehicleType,
    vehicleModel: req.body.vehicleModel,
    capacity: req.body.capacity || null,
    ownerType: req.body.ownerType,
    insuranceExpiry: req.body.insuranceExpiry || null,
    fitnessExpiry: req.body.fitnessExpiry || null,
    permitExpiry: req.body.permitExpiry || null,
    pollutionExpiry: req.body.pollutionExpiry || null,
    status: req.body.status,
    notes: req.body.notes || null,
  });

  res.status(201).json({ success: true, data: attachExpiryAlerts(vehicle) });
};

export const getVehicle = async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id, {
    include: [{ model: VehicleDocument, as: 'documents' }],
  });

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  const plain = attachExpiryAlerts(vehicle);
  plain.documents = (plain.documents || []).map(formatDocument);

  res.json({ success: true, data: plain });
};

export const updateVehicle = async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  const fields = [
    'vehicleNumber',
    'vehicleType',
    'vehicleModel',
    'capacity',
    'ownerType',
    'insuranceExpiry',
    'fitnessExpiry',
    'permitExpiry',
    'pollutionExpiry',
    'status',
    'notes',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      vehicle[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await vehicle.save();
  res.json({ success: true, data: attachExpiryAlerts(vehicle) });
};

export const deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }
  await vehicle.destroy();
  res.json({ success: true, message: 'Vehicle deleted' });
};

export const uploadDocument = async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const doc = await VehicleDocument.create({
    vehicleId: vehicle.id,
    docType: req.body.docType,
    filePath: toPublicUploadPath(req.file.path),
    originalName: req.file.originalname,
    uploadedAt: new Date(),
  });

  res.status(201).json({ success: true, data: formatDocument(doc) });
};

export const deleteDocument = async (req, res) => {
  const doc = await VehicleDocument.findOne({
    where: { id: req.params.docId, vehicleId: req.params.id },
  });

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  await doc.destroy();
  res.json({ success: true, message: 'Document deleted' });
};
